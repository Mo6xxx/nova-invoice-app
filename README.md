# Nova Invoice

A slick, futuristic invoicing app. Create, preview, print and download invoices as PDFs. Built as a self-contained static site — no build step, no backend.

## Features

- All-invoices dashboard with client search and live totals
- Create/edit invoices with From / Bill To details, line items, tax, discount and notes
- Real-time A4 invoice preview
- Print invoice with browser print
- Download invoice as PDF (`html2pdf.js`)
- Shareable invoice links encoded in the URL
- Data stored in the browser (LocalStorage)
- Ready to deploy on **Netlify** from **GitHub**

## Local preview

```bash
cd futuristic-invoice-app
python -m http.server 8080
# open http://localhost:8080
```

Any static file server works (e.g. `npx serve .` or `npx live-server`).

## Deploy to Netlify from GitHub

1. Create a new public repository on GitHub and push these files:

```bash
git init
git add .
git commit -m "Initial Nova Invoice app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/nova-invoice.git
git push -u origin main
```

2. In Netlify, choose **Add new site → Import an existing project → GitHub**.
3. Select the repository. Netlify will read `netlify.toml` and publish the root folder.
4. Your site is live.

## Tech stack

- HTML5, CSS3, vanilla JavaScript
- Google Fonts (Inter, Orbitron)
- html2pdf.js for PDF export
