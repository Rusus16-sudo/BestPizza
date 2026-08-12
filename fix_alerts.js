const fs = require('fs');
let c = fs.readFileSync('src/app/admin/AdminClient.js', 'utf8');
c = c.replace(/alert\('Erreur lors de la sauvegarde: ' \+ error\.message\)/g, "toast.error('Erreur lors de la sauvegarde: ' + error.message)");
c = c.replace(/alert\('Erreur lors de la suppression'\)/g, "toast.error('Erreur lors de la suppression')");
fs.writeFileSync('src/app/admin/AdminClient.js', c);
console.log('Replaced successfully');
