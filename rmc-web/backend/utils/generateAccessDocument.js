const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

const generateAccessDocument = async (accessRequest) => {
  try {
    const templatePath = path.join(__dirname, '../templates/Demandedaccess-template.docx');
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

    // Handle vehicles (single object or array) with the requested multiple-spaces spacing
    let vehicleText = 'N/A';
    if (accessRequest.vehicles && accessRequest.vehicles.length > 0) {
      // Loop over the plural vehicles array
      vehicleText = accessRequest.vehicles
        .filter(v => v.type || v.matricule)
        .map(v => `${v.type || ''} ${v.matricule || ''}`.trim())
        .join('       ');
    } else if (accessRequest.vehicle && (accessRequest.vehicle.type || accessRequest.vehicle.matricule)) {
      vehicleText = `${accessRequest.vehicle.type || ''} ${accessRequest.vehicle.matricule || ''}`.trim();
    }
    
    // Handle materiels (comma separated)
    let materielText = 'N/A';
    if (Array.isArray(accessRequest.materiels)) {
      materielText = accessRequest.materiels.join(', ');
    } else if (typeof accessRequest.materiels === 'string') {
      materielText = accessRequest.materiels; // Fallback if it's already a string
    }

    const docData = {
      lieu: accessRequest.location || 'N/A',
      bateau: accessRequest.bateau || 'N/A',
      "Véhicule": vehicleText,
      
      // If materiels is used as a truthy block {#materiel} in the word doc, giving it an array with 1 element works nicely
      // Inside the block, it will print `{materielText}` if you have that tag, or you can just replace `{#materiel}` with `{materielText}`
      materiel: [{ materielList: materielText }],
      materielText: materielText, // For convenience, if you just use '{materielText}'
      
      // Employees list for the table. Docxtemplater needs the row to be wrapped in {#employees} and {/employees}
      employees: (accessRequest.workers || []).map(worker => ({
        employeeName: worker.name || 'N/A',
        employeeCIN: worker.cin || 'N/A'
      })),
      
      // Fallbacks in case the user forgets to use {#employees} {/employees} in the word table
      employeeName: accessRequest.workers && accessRequest.workers.length > 0 ? accessRequest.workers[0].name : 'N/A',
      employeeCIN: accessRequest.workers && accessRequest.workers.length > 0 ? accessRequest.workers[0].cin : 'N/A',
    };

    doc.render(docData);

    const buffer = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    });

    const uploadsDir = path.join(__dirname, '../uploads/documents');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const fileName = `access-request-${Date.now()}.docx`;
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, buffer);

    return `uploads/documents/${fileName}`;
  } catch (error) {
    if (error.properties && error.properties.errors instanceof Array) {
      const errorMessages = error.properties.errors.map(function (e) {
        return e.properties.explanation;
      }).join("\n");
      console.error('Docxtemplater error:', errorMessages);
    }
    console.error('Error generating document:', error);
    throw error;
  }
};

module.exports = generateAccessDocument;
