# OpenAI Apps SDK: Building Apps for ChatGPT
This is the repository for the LinkedIn Learning course `OpenAI Apps SDK: Building Apps for ChatGPT`. The full course is available from [LinkedIn Learning][lil-course-url].

![course-name-alt-text][lil-thumbnail-url] 

## Course Description

ChatGPT now supports apps - integrations to external services that add context, content, and even UI elements to the conversation. In this course you’ll learn how to build your own apps. You can build your own ChatGPT apps using OpenAI’s Apps SDK and MCP, allowing users to call in your app during a chat and you to control what tools, context, UI, and other capabilities your app should add. The Apps SDK gives you the power to add content from your service, including text, images, video, and interactive interfaces to ChatGPT while you retain full control over user access and user experience.

## Instructions

## Requirements

This project is designed to run in GitHub Codespaces where everything is set up and ready to go.

### Running the project outside GitHub Codespaces
If you are running it locally on your computer or in a different environment, you need to install [`uv`](https://docs.astral.sh/uv) to run the backend server:

MacOS / Linux:

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

Windows:

```bash
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

## Quickstart

To run the RememberBook app you need to build and start three separate services:

1. The backend server found in `./rememberbook-backend-server`
2. The app widgets found in `./rememberbook-app/web`
3. The MCP server found in `./rememberbook-app/mcp`

Full instructions on how to build, run, and use each service is described in their respective `README.md` files.

### Start the backend server

1. Navigate to the folder:

```bash
cd rememberbook-backend-server
```

2. Sync the uv environment to install dependencies

```bash
uv sync  # Creates .venv and installs runtime + optional dev groups
```

3. Run the server

```bash
uv run python app.py
```

Use `CTRL+C` to stop the server at any time.

### Build and run the widgets server

Next, build and run the widgets server. Here you first need to generate the React widgets using the Vite build process, and then make them available using a serve script.

0. Open a new terminal (you'll now have two separate terminals running)

1. Navigate to the folder

```bash
cd rememberbook-app/web
```

2. Install dependencies using pnpm or npm

```bash
# Install dependencies
pnpm install

# Or with npm
npm install
```

3. Build the widgets using the custom Vite build process
Build production-ready component bundles:

```bash
pnpm run build
```

4. Serve the built assets with CORS enabled:

```bash
pnpm run serve
```

Use `CTRL+C` to stop the server at any time.

#### Versioning UI Widgets
When testing in ChatGPT, versioning is necessary to cache-bust the chat app. To generate a new version of the app, stop the `serve` process and then run the `bump` process. It updates the version number and re-runs `build` automatically:

```bash
npm run bump
```

Once `bump` is complete, start the `serve` process again to serve the new versioned assets.

### Build and run the MCP server

Finally, set up the MCP server. 

**NOTE:** If you change the version number of your UI widgets, you need to stop, rebuild, and start the MCP server again for the versions to kick in.

0. Open a new terminal (you'll now have three terminals open at the same time)

1. Navigate to the folder

```bash
cd rememberbook-app/mcp
```

2. Install dependencies:

```bash
npm install
```

3. Build the TypeScript code:

```bash
npm run build
```

4. Set the RememberBook API URL (optional):

```bash
export REMEMBERBOOK_API_URL=http://localhost:5055
```

5. Start the server:

```bash
npm start
```

Use `CTRL+C` to stop the server at any time.

### Make Codespaces ports public

When running in Codespaces, to test the app in an MCP inspector or ChatGPT you must make each of the three ports public:

1. Go to the "PORTS" tab in terminal
2. Under the "Visibility" column, right-click on "🔒 Private"
3. On the drop-down, select "Port Visibility"
4. Select "Public"

Under "Visibility" each of the three forwarded ports should now show "Public"

**NOTE:** Port visibility resets to "Private" and has to be manually changed every time you start or restart a Codespace. It may also revert to "Private" when you stop and restart a server, so it's good practice to check the visibility status of your ports any time you make a change.

## Instructor

Morten Rand-Hendriksen

Principal Staff Instructor, Speaker, Web Designer, and Software Developer


[0]: # (Replace these placeholder URLs with actual course URLs)

[lil-course-url]: https://www.linkedin.com/learning/openai-apps-sdk-building-apps-for-chatgpt-asi
[lil-thumbnail-url]: https://media.licdn.com/dms/image/v2/D560DAQHZxkcX3ZmpTw/learning-public-crop_675_1200/B56ZoCpcntHAAY-/0/1760981011787?e=2147483647&v=beta&t=j-f2QXnSEa1GnZl-eLQSCiq18vva-snHfV5PUAcDYIk

