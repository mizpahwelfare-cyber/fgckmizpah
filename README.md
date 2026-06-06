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
5. The added `CNAME` file configures a custom domain for GitHub Pages. Replace `fgckmizpah.online` with your actual purchased domain if needed.

### Custom domain setup for public access

To make your site available under a public church domain:

1. Buy or configure a domain like `fgckmizpah.online` or `fgckmizpah.com`.
2. Keep the `CNAME` file in the project root with your chosen domain.
3. In your domain registrar/DNS settings, point the domain to GitHub Pages using these records:
   - `A` record for `@` to `185.199.108.153`
   - `A` record for `@` to `185.199.109.153`
   - `A` record for `@` to `185.199.110.153`
   - `A` record for `@` to `185.199.111.153`
   - `CNAME` record for `www` to `YOUR_GITHUB_USERNAME.github.io`
4. Wait for DNS propagation, then open:
   ```text
   https://fgckmizpah.online
   ```

> Note: This deployment is for the static front-end. If you need the Node backend (`server.js`) to run publicly, you must deploy the server separately to a Node host such as Render, Railway, or Heroku, and then update the front-end API endpoints.

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

### Access using your church name locally

To access the app in your browser with a friendly church name instead of `localhost`:

1. Edit your hosts file as administrator.
   - Windows: `C:\Windows\System32\drivers\etc\hosts`
   - macOS/Linux: `/etc/hosts`
2. Add a line such as:

```text
127.0.0.1 mizpahonline.local
```

3. Start the server:

```powershell
npm start
```

4. Open the app in your browser:

```text
http://mizpahonline.local:3000
```

If you want to use a custom host binding, you can also start the server with a `HOST` environment variable:

```powershell
set HOST=mizpahonline.local
npm start
```

> Note: The host name must be mapped to `127.0.0.1` in your hosts file for local access.

### Backend server

A Node/Express backend has been added to store members and records on disk instead of only in browser storage.

Run the backend locally with:

```powershell
npm install
npm start
```

Then open:

```text
http://localhost:3000
```

The backend exposes the following example API endpoints:

- `GET /api/status`
- `GET /api/members`
- `POST /api/members`
- `GET /api/members/:id`
- `PUT /api/members/:id`
- `DELETE /api/members/:id`
- `GET /api/backup`
- `POST /api/import` (upload JSON/Excel file)

> Note: This backend runs locally or on any Node-compatible host. GitHub Pages cannot execute server code.

