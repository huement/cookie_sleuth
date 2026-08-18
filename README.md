# COOKIE SLEUTH // Cookie Stuffing Guard

A Manifest V3 Chrome Extension powered by React, TypeScript, and Tailwind CSS v4 that monitors browser cookie assignments to detect and audit cookie stuffing attacks in real time.

## Development Quickstart

```bash
# Install dependencies
pnpm install

# Run hot-reloading dev server
pnpm dev

# Build production bundle
pnpm build
```

### Loading into Chrome

1. Build the project using pnpm build.
2. Open Chrome and navigate to chrome://extensions/.
3. Enable Developer mode in the top right corner.
4. Click Load unpacked and select the generated dist/ directory.

### Formatting & Linting

```bash
pnpm lint
pnpm format
```

### Project Structure

- `src/`: Source code directory
  - `background/`: Background script for handling cookie monitoring
  - `content/`: Content script for intercepting cookie assignments
  - `popup/`: React-powered popup UI for displaying results
- `public/`: Static assets
- `dist/`: Build output directory

## Laboratory Testing

In order to test out the extension, I have setup a Laravel backend that will trigger cookie stuffing attacks. The backend is located at [https://labs.huement.com](labs.huement.com) . In order to accurately test the extension, you can't use only a Javascript vectors for the attack, you will need a server of some kind, (Python, PHP, etc) in order to trigger some of the attacks. However there is a Github pages hosted version that will allow you to test SOME possible cookie stuffing attacks that is going to be released soon, as well as a docker container version that will allow for all possible cookie stuff attacks. So follow the repo and stay tuned for those upcoming releases.
