const PdfPrinter = require('pdfmake');
const fs = require('fs');
const uniqid = require('uniqid');

// Define fonts
const fonts = {
    Roboto: {
        normal: 'utilities/pdfmaking/Roboto/Roboto-Regular.ttf',
        bold: 'utilities/pdfmaking/Roboto/Roboto-Bold.ttf',
        italics: 'utilities/pdfmaking/Roboto/Roboto-Italic.ttf',
        bolditalics: 'utilities/pdfmaking/Roboto/Roboto-BoldItalic.ttf'
    }
};

const printer = new PdfPrinter(fonts);

function createSalesReport(req, res, name, establishment, date, tableHeader, data, totalSales) {
    const docDefinition = {
        content: [
            {
                image: 'utilities/pdfmaking/assets/AppLogo.png',
                width: 300,
                style: "logo"
            },
            { text: establishment.name, style: 'header' },
            { text: establishment.address, style: 'subheader' },
            { columns: 
                [
                    { text: `From: ${date.from} To: ${date.to}`, style: 'subheader', alignment: 'left' },
                    { text: `Total Sales: ${totalSales}`, style: 'subheader', alignment: 'right' }
                ]
            },
            {
                style: 'tableExample',
                table: {
                    widths: [30, 150, 150, 150, 100, 50, 50, 70],
                    body: [
                        [
                            { text: "#", style: 'tableHeader' },
                            { text: 'Date', style: 'tableHeader' },
                            { text: 'Sales ID', style: 'tableHeader' },
                            { text: 'Total', style: 'tableHeader' }],
                            ...data.map(item => tableHeader.map(header => item[header] || '----'))
                    ]
                }
            },
        ],
        styles: {
            logo: {
                alignment: 'center',
                margin: [0, 0, 0, 35]
            },
            header: {
                fontSize: 18,
                bold: true
            },
            subheader: {
                fontSize: 14,
                bold: true,
                margin: [0, 10, 0, 5]
            },
            tableExample: {
                margin: [0, 5, 0, 15]
            },
            tableHeader: {
                bold: true,
                fontSize: 13,
                color: 'black'
            }
        },
        defaultStyle: {
            // alignment: 'justify'
        }
    };

    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${name}.pdf`);
    pdfDoc.pipe(res);
    pdfDoc.end();
}

function createInventoryReport(req, res, name, establishment, date, tableHeader, data) {
    const docDefinition = {
        content: [
            {
                image: 'utilities/pdfmaking/assets/AppLogo.png',
                width: 300,
                style: "logo"
            },
            { text: establishment.name, style: 'header' },
            { text: establishment.address, style: 'subheader' },
            { text: `as of ${date}`, style: 'subheader', alignment: 'right' },
            {
                style: 'tableExample',
                table: {
                    widths: [30, 150, 150, 150, 100, 50, 50, 70],
                    body: [
                        [
                            { text: "#", style: 'tableHeader' },
                            { text: 'Name', style: 'tableHeader' },
                            { text: 'Quantity', style: 'tableHeader' },
                            { text: 'Price', style: 'tableHeader' }],
                            ...data.map(item => tableHeader.map(header => item[header]))
                    ]
                }
            }
        ],
        styles: {
            logo: {
                alignment: 'center',
                margin: [0, 0, 0, 35]
            },
            header: {
                fontSize: 18,
                bold: true
            },
            subheader: {
                fontSize: 14,
                bold: true,
                margin: [0, 10, 0, 5]
            },
            tableExample: {
                margin: [0, 5, 0, 15]
            },
            tableHeader: {
                bold: true,
                fontSize: 13,
                color: 'black'
            }
        },
        defaultStyle: {
            // alignment: 'justify'
        }
    }

    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${name}.pdf`);
    pdfDoc.pipe(res);
    pdfDoc.end();
};

module.exports = {
    createSalesReport,
    createInventoryReport
}