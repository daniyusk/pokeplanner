# Security Policy

## Project Architecture & Threat Surface

**PokéPlanner** is a 100% client-side static web application with no backend servers, databases, or user authentication. All state is stored locally in the user's browser (`IndexedDB` / `localStorage`) or encoded directly in shareable URLs.

The primary security-sensitive areas in this repository are:

- **URL & Showdown Import Parsing (`src/domain/sharing/`)**: untrusted input decoding, prototype pollution, or injection/XSS risks when rendering imported names or payloads.
- **PWA & Browser Storage**: service worker caching and local persistence behavior.
- **Third-Party Dependencies**: npm dependencies bundled into the client build or executed in CI.

## Supported Versions

Security fixes are applied directly to the `main` branch and deployed continuously.

## Reporting a Vulnerability

Please **do not** report security vulnerabilities through public GitHub issues or pull requests.

Instead, report vulnerabilities privately through GitHub Security Advisories:

- https://github.com/daniyusk/pokeplanner/security/advisories/new

Please include as much of the following information as possible:

- A clear description of the vulnerability and its potential impact.
- Reproduction steps, sample URL/Showdown payload, or proof-of-concept.
- Affected files, components, or browser/environment details.

We will review reports promptly, coordinate a fix before public disclosure, and credit reporters who wish to be acknowledged.
