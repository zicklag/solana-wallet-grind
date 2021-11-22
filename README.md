# Solana Wallet Grind

A utility for grinding for Solana wallet addresses starting with a specific sequence of letters.

See this [forum topic](https://forums.solana.com/t/fancy-solana-addresses/3615?u=zicklag) for more explanation.

## Install

Requires [Deno] and the Solana CLI to be installed. Then run:

```
deno install --allow-run=solana-keygen --name solana-wallet-grind https://raw.githubusercontent.com/zicklag/solana-wallet-grind/master/mod.ts
```

Deno automatically sandboxes the script to prevent it access to your system. This means things like disk and network access must be granted explicitly. The deno install command above only grants the script access to run the `solana-keygen` command, so you know that it can't access your network or disk or do anything else on your computer other than use the `solana-keygen` command. This is great for security!

## Performance

This tool is _waaayyyy_ slower 

[Deno]: https://deno.land/

