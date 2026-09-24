const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

// ── Date formatting ────────────────────────────────────────────────────────
const MONTHS_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
];

function formatDateFr(dateStr) {
  const d = new Date(dateStr);
  return `${d.getDate()} ${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`;
}

// ── Amount formatting (French locale, 3 decimals) ──────────────────────────
function formatMoney(n) {
  if (n === null || n === undefined || n === '') return '';
  const num = parseFloat(n);
  if (isNaN(num)) return '';
  return num.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

// ── Number to French words ─────────────────────────────────────────────────
const ONES = [
  '', 'Un', 'Deux', 'Trois', 'Quatre', 'Cinq', 'Six', 'Sept', 'Huit', 'Neuf',
  'Dix', 'Onze', 'Douze', 'Treize', 'Quatorze', 'Quinze', 'Seize',
  'Dix-Sept', 'Dix-Huit', 'Dix-Neuf'
];
const TENS = ['', '', 'Vingt', 'Trente', 'Quarante', 'Cinquante', 'Soixante'];

function belowHundred(n) {
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10);
  const u = n % 10;
  if (t === 7) {
    if (u === 0) return 'Soixante-Dix';
    if (u === 1) return 'Soixante et Onze';
    return 'Soixante-' + ONES[10 + u];
  }
  if (t === 8) {
    if (u === 0) return 'Quatre-Vingts';
    return 'Quatre-Vingt-' + ONES[u];
  }
  if (t === 9) {
    if (u === 0) return 'Quatre-Vingt-Dix';
    return 'Quatre-Vingt-' + ONES[10 + u];
  }
  if (u === 0) return TENS[t];
  if (u === 1) return TENS[t] + ' et Un';
  return TENS[t] + '-' + ONES[u];
}

function belowThousand(n) {
  if (n < 100) return belowHundred(n);
  const h = Math.floor(n / 100);
  const r = n % 100;
  const centWord = h === 1 ? 'Cent' : ONES[h] + ' Cent' + (r === 0 && h > 1 ? 's' : '');
  if (r === 0) return centWord;
  return centWord + ' ' + belowHundred(r);
}

function integerToFrench(n) {
  if (n === 0) return 'Zéro';
  if (n < 1000) return belowThousand(n);
  if (n < 1000000) {
    const thou = Math.floor(n / 1000);
    const rem = n % 1000;
    const thousandWord = thou === 1 ? 'Mille' : belowThousand(thou) + ' Mille';
    return rem === 0 ? thousandWord : thousandWord + ' ' + belowThousand(rem);
  }
  const mil = Math.floor(n / 1000000);
  const rem = n % 1000000;
  const millionWord = mil === 1 ? 'Un Million' : belowThousand(mil) + ' Millions';
  return rem === 0 ? millionWord : millionWord + ' ' + integerToFrench(rem);
}

function numberToFrenchWords(n) {
  const num = parseFloat(n) || 0;
  // Round to millimes first. Rounding the fraction on its own turns 1.9999
  // into "Un et Mille Millimes" instead of "Deux".
  const totalMillimes = Math.round(num * 1000);
  const intPart = Math.floor(totalMillimes / 1000);
  const milPart = totalMillimes % 1000;
  let result = integerToFrench(intPart);
  if (milPart > 0) result += ' et ' + integerToFrench(milPart) + ' Millimes';
  return result + ' Dinars HT';
}

// ── Main generator ─────────────────────────────────────────────────────────
const generateFacturationDocument = async ({
  factureNumber, date, clientName, clientAddress, clientTel, items, totalHT, bonNumber
}) => {
  try {
    const templatePath = path.join(__dirname, '../templates/Facture-Template.docx');
    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);
    
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: function(part) {
        if (!part.module) {
            return '';
        }
        if (part.module === "rawxml") {
            return "";
        }
        return '';
      }
    });

    const dateFr = formatDateFr(date || new Date());
    const amountWords = numberToFrenchWords(totalHT || 0);

    const docData = {
      date: dateFr,
      clientName: clientName || '',
      clientAddress: clientAddress || '',
      factureNumber: factureNumber || '',
      bonNumber: bonNumber || '',
      
      taches: (items || []).map((item, index) => ({
        index: index + 1,
        description: item.description || '',
        "unité": item.unite || '', // Accented dynamically matching their template
        quantite: item.quantite != null ? String(item.quantite) : '',
        prixUHT: formatMoney(item.prixUHT),
        prixTHT: formatMoney(item.prixTHT)
      })),
      
      totalHT: formatMoney(totalHT),
      totalInWords: amountWords
    };

    doc.render(docData);

    const buffer = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    });

    return buffer; // For Facturation, the route immediately downloads it instead of saving it on disk
  } catch (error) {
    let errMsg = error.message;
    if (error.properties && error.properties.errors instanceof Array) {
      errMsg = error.properties.errors.map(function (e) {
        return e.properties && e.properties.explanation ? e.properties.explanation : e.message;
      }).join("\n");
      console.error('Docxtemplater Template Error(s):\n', errMsg);
    } else {
      console.error('Error generating Facture:', error.message || error);
    }
    throw new Error(errMsg);
  }
};

module.exports = generateFacturationDocument;
