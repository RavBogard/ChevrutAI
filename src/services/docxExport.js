import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';

// Helper to strip HTML tags and decode entities if needed
const stripHtml = (html) => {
    if (!html) return "";
    let tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
};

const formatText = (text) => {
    if (Array.isArray(text)) {
        return text.map(t => stripHtml(t)).join('\n');
    }
    return stripHtml(text);
};

export const exportToDocx = async (title, sources) => {
    const doc = new Document({
        sections: [{
            properties: {},
            children: [
                new Paragraph({
                    text: title,
                    heading: HeadingLevel.TITLE,
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 400 },
                }),
                ...sources.flatMap(source => {
                    const hebrewText = formatText(source.he);
                    const englishText = formatText(source.en);
                    const citation = source.ref;

                    if (source.type === 'header') {
                        return [
                            new Paragraph({
                                text: englishText,
                                heading: HeadingLevel.HEADING_2,
                                alignment: AlignmentType.CENTER,
                                spacing: { before: 400, after: 200 },
                            })
                        ];
                    }

                    if (source.type === 'custom') {
                        const elements = [];
                        if (source.title) {
                            elements.push(new Paragraph({
                                text: source.title,
                                heading: HeadingLevel.HEADING_3,
                                spacing: { before: 200, after: 100 },
                            }));
                        }
                        elements.push(new Paragraph({
                            text: englishText,
                            spacing: { after: 200 },
                        }));
                        return elements;
                    }

                    return [
                        // Citation Header
                        new Paragraph({
                            text: citation,
                            heading: HeadingLevel.HEADING_4, // Reduced from H2 since headers are H2
                            spacing: { before: 200, after: 100 },
                            alignment: AlignmentType.CENTER
                        }),
                        // Side-by-Side Table
                        new Table({
                            width: {
                                size: 100,
                                type: WidthType.PERCENTAGE,
                            },
                            rows: [
                                new TableRow({
                                    children: [
                                        new TableCell({
                                            children: [new Paragraph({
                                                text: englishText,
                                                alignment: AlignmentType.LEFT
                                            })],
                                            width: {
                                                size: 50,
                                                type: WidthType.PERCENTAGE,
                                            },
                                        }),
                                        new TableCell({
                                            children: [new Paragraph({
                                                text: hebrewText,
                                                alignment: AlignmentType.RIGHT,
                                                bidirectional: true // For Hebrew RTL support in Word
                                            })],
                                            width: {
                                                size: 50,
                                                type: WidthType.PERCENTAGE,
                                            },
                                        }),
                                    ],
                                }),
                            ],
                        }),
                        new Paragraph({ text: "" }), // Spacer
                    ];
                })
            ],
        }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.docx`);
};
