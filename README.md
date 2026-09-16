# GitHub Profile README Generator

A privacy-friendly, static generator for creating polished GitHub profile `README.md` files.

## Features

- Live Markdown preview
- Section toggles
- GitHub stats, contribution activity, snake and trophies
- Download `README.md`
- Copy generated Markdown
- ChatGPT-assisted generation without an OpenAI API key
- Import structured profile data generated in a user's own ChatGPT session
- Runs entirely as a static GitHub Pages site

## ChatGPT mode

The site does not call the OpenAI API. Users can open ChatGPT, use the provided interview prompt, ask ChatGPT to generate the profile JSON, paste that JSON into the generator, and then use the generator's template engine to produce the final README.

## GitHub Pages

Enable **Settings → Pages → Source: GitHub Actions** in the repository. The included workflow deploys the static site on pushes to `main`.
