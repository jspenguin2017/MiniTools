# Mini Tools

Mini Tools is a collection of browser tools for preparing filter lists and inspecting JavaScript arrays.

[Open Mini Tools](https://jspenguin2017.github.io/MiniTools/)

## Features

### Filters Toolkit

Transform pasted text to help write and maintain filters:

- **Links to domains:** Extract the domain from the first link on each line and produce a sorted, comma-separated list.
  Duplicates are preserved, with warnings for missing or extra links.
- **Merge domains:** Combine comma-separated domain lists, sort the result, and remove duplicate and invalid entries
  with warnings.
- **Unmerge domains:** Remove domains listed on subsequent lines from the first line, removing one occurrence per match
  and warning about unmatched entries.
- **Unicode escape:** Convert non-ASCII characters to Unicode escape sequences.

Each transformation provides a **Copy Output** button to copy the result without warnings.

### JavaScript Analyzer

**Unhex** decodes escaped strings in JavaScript array literals and displays the parsed array as JSON. Paste the full
array, including square brackets, and select **Parse**. Then use **Find Index** to search string entries for a substring
or **Find Value** to look up an entry by index. Negative indices count from the end of the array.

Ordinary arrays are also supported. Input is parsed as data; JavaScript expressions and statements are not executed.

## Development quick start

Use the Node.js version specified in [package.json](package.json), then clone the repository and install dependencies:

```sh
git clone https://github.com/jspenguin2017/MiniTools.git
cd MiniTools
npm ci
```

Serve `docs/` with a local HTTP server. For example, with Python 3 installed:

```sh
python3 -m http.server 8000 --directory docs
```

Open [localhost:8000](http://localhost:8000/). Edit the files in `docs/` and refresh the browser to see changes. No
build step is required.

Run `npm test` to check your changes and `npm run format` to format the repository.
