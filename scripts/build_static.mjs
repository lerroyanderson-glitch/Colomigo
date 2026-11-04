// Keep server code, migrations, tests and package metadata out of published static files.
import { cp, rm, mkdir } from 'node:fs/promises';

const files = [
  'index.html', 'assets', 'insights', 'about',
  'colocation-renewals', 'colocation-relocations',
  '_redirects', 'robots.txt', 'sitemap.xml'
];
await rm('dist',{recursive:true,force:true});
await mkdir('dist',{recursive:true});
for (const file of files) {
  await cp(file, 'dist/'+file, {recursive:true});
}
console.log('Built Colo-Migo static site into dist/');
