// backend/utils/generateBonDeReceptionDocument.js
const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

const generateBonDeReceptionDocument = async (bon) => {
  try {
    // 1. Get the path to your Word template
    const templatePath = path.join(__dirname, '../templates/Bondereception-Template.docx');
    
    // Load the template file as binary
    const content = fs.readFileSync(templatePath, 'binary');
    
    // Unzip the content of the file
    const zip = new PizZip(content);
    
    // Create docxtemplater instance
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    // 2. Format date (MM-YYYY)
    const formatDate = (date) => {
      const d = new Date(date);
      return `${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
    };

    // 3. Prepare data for the template
    // The keys must match exactly the tags in your Word document (without the {})
    const docData = {
      clientName: bon.clientName || 'N/A',
      unite: bon.unite || 'N/A',
      date: formatDate(bon.createdAt),
      
      // The array of tasks. Important: The word doc MUST have {#taches} in the first cell 
      // of the row you want to repeat, and {/taches} in the last cell.
      // Inside, you use {description}, {unité}, {quantite}
      taches: bon.taches.map((tache, index) => ({
        index: index + 1, // <--- We added the index here (1, 2, 3...)
        description: tache.description || 'N/A',
        "unité": tache.uniteQuantite || 'N/A', 
        quantite: tache.quantite || 0
      }))
    };

    // 4. Render the document (replace all occurrences of {tag} by the values from docData)
    doc.render(docData);

    // 5. Get the zip buffer and save it
    const buffer = doc.getZip().generate({
      type: 'nodebuffer',
      // compression: DEFLATE adds compression 
      compression: 'DEFLATE',
    });

    const uploadsDir = path.join(__dirname, '../uploads/bon-de-reception');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const fileName = `bon-${bon.bonNumber}-${Date.now()}.docx`;
    const filePath = path.join(uploadsDir, fileName);
    
    fs.writeFileSync(filePath, buffer);

    return `uploads/bon-de-reception/${fileName}`;
  } catch (error) {
    if (error.properties && error.properties.errors instanceof Array) {
      const errorMessages = error.properties.errors.map(function (e) {
        return e.properties.explanation;
      }).join("\n");
      console.error('Docxtemplater error:', errorMessages);
    }
    console.error('Error generating Bon de Réception:', error);
    throw error;
  }
};

module.exports = generateBonDeReceptionDocument;