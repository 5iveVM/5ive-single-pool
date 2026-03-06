# Scenarios

## Golden Path (Local)

```bash
npm run smoke
```

## Working On-Chain Subset (Local Validator)

This project is a partial parity port. Use the validated local flow first.

Prereqs:
- local validator running
- Five VM program deployed

```bash
npm run smoke:onchain:local
npm run client:compare
```

## Optional Devnet Path

```bash
npm run test:onchain:devnet
```
