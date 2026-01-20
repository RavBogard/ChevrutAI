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

                    // Default Sefaria Source
                    const mode = source.viewMode || 'bilingual';

                    const englishCell = new TableCell({
                        children: [new Paragraph({
                            text: englishText,
                            alignment: AlignmentType.LEFT
                        })],
                        width: {
                            size: mode === 'bilingual' ? 50 : 100,
                            type: WidthType.PERCENTAGE,
                        },
                    });

                    const hebrewCell = new TableCell({
                        children: [new Paragraph({
                            text: hebrewText,
                            alignment: AlignmentType.RIGHT,
                            bidirectional: true
                        })],
                        width: {
                            size: mode === 'bilingual' ? 50 : 100,
                            type: WidthType.PERCENTAGE,
                        },
                    });

                    let tableRows = [];
                    if (mode === 'bilingual') {
                        tableRows = [new TableRow({ children: [englishCell, hebrewCell] })];
                    } else if (mode === 'english') {
                        tableRows = [new TableRow({ children: [englishCell] })];
                    } else if (mode === 'hebrew') {
                        tableRows = [new TableRow({ children: [hebrewCell] })];
                    }

                    return [
                        // Citation Header
                        new Paragraph({
                            text: citation,
                            heading: HeadingLevel.HEADING_4,
                            spacing: { before: 200, after: 100 },
                            alignment: AlignmentType.CENTER
                        }),
                        // Table
                        new Table({
                            width: {
                                size: 100,
                                type: WidthType.PERCENTAGE,
                            },
                            rows: tableRows,
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
