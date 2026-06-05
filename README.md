# MIZPAH ONLINE Church System

A simple online church member registration system built with HTML, CSS, and JavaScript.

## Features

- Register members with Name, Phone Number, Group, and Date Joined
- Automatically generate membership numbers in the format `MIZ-26/000`
- List registered members on the page
- Data persists in the browser using localStorage

## Usage

1. Open `index.html` in a browser.
2. Fill out the registration form.
3. Submit to add the member and generate the membership number.

## Deployment

This project is a static site and can be deployed to any static host such as GitHub Pages, Vercel, or Netlify.

### GitHub Pages

1. Initialize a git repository in the project folder:
   ```powershell
   cd "C:\Users\HP\Documents\MIZPAH ONLINE"
   git init
   git add .
   git commit -m "Initial deploy-ready version"
   ```
2. Create a GitHub repository and add it as a remote, for example:
   ```powershell
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git branch -M main
   git push -u origin main
   ```
3. The included workflow `.github/workflows/deploy.yml` will automatically publish the site to the `gh-pages` branch when you push to `main`.
4. In the repository settings, enable GitHub Pages and set the source to the `gh-pages` branch.

### Vercel

1. Install Vercel CLI:
   ```powershell
   npm install -g vercel
   ```
2. Run:
   ```powershell
   vercel
   ```
3. Follow the prompts and choose the current folder as the project.
4. Deploy the site with:
   ```powershell
   vercel --prod
   ```

### Netlify

1. Install Netlify CLI:
   ```powershell
   npm install -g netlify-cli
   ```
2. Deploy the site:
   ```powershell
   netlify deploy --dir=. --prod
   ```

### Local preview

To preview the app locally before deploying:

```powershell
npm install
npm start
```
