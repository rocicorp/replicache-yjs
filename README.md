# `@rocicorp/reflect-yjs`

This library enables storing and syncing Yjs documents via [Reflect](https://reflect.net/).

Live demo at https://type.reflect.net/.

## Features

- **Awareness**: A robust implementation of Yjs "awareness" is included. Awareness is correctly cleaned up in all cases including tab-close, tab/browser-crash, navigation, tab-switch, offline, etc.
- **Multiple Documents**: A single Reflect room can host any number of Yjs documents efficiently.
- **Chunking** (soon): Large Yjs documents are automatically broken down into smaller pieces for efficient incremental updates.
- **Editor Integration Examples**: Contains practical examples for `codemirror-yjs`, `monaco-yjs`, `tiptap-yjs`.

## Getting Started

### Installation

To install `@rocicorp/reflect-yjs`, run the following command:

```bash
npm install @rocicorp/reflect-yjs@latest
```

### Running an Example

To explore an example, such as the CodeMirror integration, follow these steps:

1. Clone this repository

   ```bash
   git clone git@github.com:rocicorp/reflect-yjs.git
   cd reflect-yjs
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Build the project**

   ```bash
   npm run build
   ```

4. **Navigate to the example directory**

   ```bash
   cd examples/codemirror
   ```

5. **Start the example**
   ```bash
   npm run watch
   ```

## Publishing Your Project

To publish your project with Reflect and deploy the UI:

1. **Publish the Reflect server**

   ```bash
   npx reflect publish
   ```

2. **Deploy the UI (Example: using Vercel)**
   ```bash
   npx vercel
   ```
