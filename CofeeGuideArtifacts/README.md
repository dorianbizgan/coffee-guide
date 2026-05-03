# Coffee Brew Tracker

Personal espresso, V60, and AeroPress brew tracker.

## Setup — GitHub Pages

1. Create a new repo on GitHub (e.g. `coffee-tracker`)
2. Push this folder:
   ```bash
   cd coffee-tracker
   git init
   git add .
   git commit -m "initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/coffee-tracker.git
   git push -u origin main
   ```
3. Go to **Settings → Pages** in your repo
4. Under "Source", select **Deploy from a branch**
5. Pick **main** branch, **/ (root)** folder, click Save
6. Your site will be live at `https://YOUR_USERNAME.github.io/coffee-tracker/` within a minute or two

## Updating

When you get updated `index.html` files from Claude, replace the file and push:
```bash
git add index.html
git commit -m "update tracker"
git push
```
