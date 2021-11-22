import {
  args,
  Option,
  PartialOption,
  FiniteNumber,
  Text,
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
    PartialOption("threads", {
      describe: "How many threads to use",
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
  );

// Parse CLI arguments
const parsedArgs = argParser.parse(Deno.args);
if (parsedArgs.tag == PARSE_FAILURE) {
  console.error("Could not parse CLI args");
  console.error(parsedArgs.error.toString());
  Deno.exit(1);
}

console.debug("settings:", parsedArgs.value);

const threadCount = parsedArgs.value.threads;
const wordCount = parsedArgs.value.words;
const startsWith = parsedArgs.value.startsWith;

const threads = [];
for (let i = 0; i < threadCount; i++) {
  threads.push(
    new Promise<Key>((resolve) => {
      const tryNextAccount = () => {
        genPrimaryAccountKey(wordCount).then((key) => {
          if (key.pubkey.startsWith(startsWith)) {
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

const key = await Promise.race(threads);

console.log("Found matching seed phrase and public address:", key);

Deno.exit(0);
