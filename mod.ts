import {
  args,
  Option,
  PartialOption,
  FiniteNumber,
  Text,
  BinaryFlag,
  PARSE_FAILURE,
  EarlyExitFlag,
} from "https://deno.land/x/args@2.1.1/index.ts";

interface Key {
  seed: string;
  pubkey: string;
}

interface GenKeyOptions {
  wordCount?: number;
}

const defaultGenKeyOpts = {
  wordCount: 12,
};

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

/** Generate a random keypair */
async function genKey(options?: GenKeyOptions): Promise<Key> {
  const pubkeyRegex = /pubkey: ([a-zA-Z0-9]+)/;
  const seedPhraseRegex =
    /Save this seed phrase and your BIP39 passphrase to recover your new keypair:\n([a-zA-Z ]+).*/;

  const opts = {
    ...defaultGenKeyOpts,
    ...options,
  };

  const p = Deno.run({
    cmd: [
      "solana-keygen",
      "new",
      "--no-outfile",
      "--word-count",
      opts.wordCount.toString(),
    ],
    stdin: "piped",
    stdout: "piped",
    stderr: "null",
  });

  await p.stdin.write(textEncoder.encode("\n"));

  await p.status();

  const output = textDecoder.decode(await p.output());

  return {
    pubkey: output.match(pubkeyRegex)![1],
    seed: output.match(seedPhraseRegex)![1],
  };
}

/** Get the primary Solana wallet address from a seed phrase */
async function getPrimaryAccountPubkey(seed: string): Promise<string> {
  const p = Deno.run({
    cmd: ["solana-keygen", "pubkey", "prompt://?full-path=m/44'/501'/0'/0'"],
    stdin: "piped",
    stdout: "piped",
    stderr: "null",
  });

  await p.stdin.write(textEncoder.encode(seed + "\n\n"));

  await p.status();

  const output = textDecoder.decode(await p.output()).replace("\n", "");

  return output;
}

/** Genarate a primary account and it's seed phrase */
async function genPrimaryAccountKey(wordCount: number): Promise<Key> {
  const key = await genKey({ wordCount });
  const primaryAccountPubkey = await getPrimaryAccountPubkey(key.seed);

  return {
    ...key,
    pubkey: primaryAccountPubkey,
  };
}

// Define the CLI argument parser
const argParser = args
  .describe("Grind for Solana vanity pubkeys")
  .with(
    EarlyExitFlag("help", {
      describe: "Show help",
      alias: ["h"],
      exit() {
        console.log(argParser.help());
        return Deno.exit();
      },
    })
  )
  .with(
    Option("startsWith", {
      describe: "What the public key should start with",
      type: Text,
      alias: ["s"],
    })
  )
  .with(
    PartialOption("tasks", {
      describe:
        "How many async tasks to use to grind. It may actually be useful to set this higher than your number of CPU cores, because these don't correspond exactly to CPU threads",
      default: 6,
      type: FiniteNumber,
      alias: ["t"],
    })
  )
  .with(
    PartialOption("words", {
      describe: "How many words to have in the seed phrase",
      default: 12,
      type: FiniteNumber,
      alias: ["w"],
    })
  )
  .with(BinaryFlag("caseInsensitive", { alias: ["i"] }));
// Parse CLI arguments
const parsedArgs = argParser.parse(Deno.args);
if (parsedArgs.tag == PARSE_FAILURE) {
  console.error("Could not parse CLI args");
  console.error(parsedArgs.error.toString());
  Deno.exit(1);
}

console.debug("settings:", parsedArgs.value);

const taskCount = parsedArgs.value.tasks;
const wordCount = parsedArgs.value.words;
const caseInsensitive = parsedArgs.value.caseInsensitive;
const startsWith = caseInsensitive
  ? parsedArgs.value.startsWith.toLowerCase()
  : parsedArgs.value.startsWith;

const tasks = [];
for (let i = 0; i < taskCount; i++) {
  tasks.push(
    new Promise<Key>((resolve) => {
      const tryNextAccount = () => {
        genPrimaryAccountKey(wordCount).then((key) => {
          const pubkeyCmp = caseInsensitive
            ? key.pubkey.toLowerCase()
            : key.pubkey;

          if (pubkeyCmp.startsWith(startsWith)) {
            resolve(key);
          } else {
            tryNextAccount();
          }
        });
      };

      tryNextAccount();
    })
  );
}

const key = await Promise.race(tasks);

console.log("Found matching seed phrase and public address:", key);

Deno.exit(0);
