# Solana Wallet Grind

A utility for grinding for Solana wallet addresses starting with a specific sequence of letters.

See this [forum topic](https://forums.solana.com/t/fancy-solana-addresses/3615?u=zicklag) for more explanation.

## Install

Requires [Deno] and the Solana CLI to be installed. Then run:

```
deno install --allow-run=solana-keygen --name solana-wallet-grind https://raw.githubusercontent.com/zicklag/solana-wallet-grind/master/mod.ts
```

Deno automatically sandboxes the script to prevent it access to your system. This means things like disk and network access must be granted explicitly. The deno install command above only grants the script access to run the `solana-keygen` command, so you know that it can't access your network or disk or do anything else on your computer other than use the `solana-keygen` command. This is great for security!

## Usage

```
$ solana-wallet-grind --help
DESCRIPTION:
  Grind for Solana vanity pubkeys
OPTIONS:
  --help, -h
    Show help
  --startsWith, -s <text>
    What the public key should start with
  --tasks, -t <number> [default: 6]
    How many async tasks to use to grind. It may actually be useful to set this higher than your number of CPU cores, because these don't correspond exactly to CPU threads
  --words, -w <number> [default: 12]
    How many words to have in the seed phrase
  --caseInsensitive, -i
```

## Performance

This tool is _waaayyyy_ slower 

[Deno]: https://deno.land/

