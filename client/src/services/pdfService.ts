import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Helper functions for formatting content (similar to BusinessPlan formatting)
const formatFinancialProjectionsForPDF = (content: string | null): string => {
    if (!content) return '';

    let formatted = content;

    // Handle escaped newlines first
    formatted = formatted.replace(/\\n/g, '\n');

    // Tables are already handled separately in PDF generation
    // This function cleans up the text for better display
    return formatted;
};

// Parse and extract tables from markdown content
const parseTables = (content: string): { tables: any[], remainingText: string } => {
    const tables: any[] = [];
    const lines = content.split(/\r?\n/);
    const tableBlocks: { start: number; end: number }[] = [];
    let tableStart = -1;

    // Find all table blocks - more robust detection
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        const hasPipe = trimmed.includes('|') && trimmed.split('|').length >= 3;
        // Also check for separator line pattern
        const isSeparator = trimmed.match(/^\|[\s:|-]+\|$/);

        if (hasPipe || isSeparator) {
            if (tableStart === -1) {
                tableStart = i;
            }
        } else {
            if (tableStart !== -1) {
                // Allow one blank line within table if next line is still part of table
                if (trimmed === '' && i + 1 < lines.length) {
                    const nextLine = lines[i + 1].trim();
                    if (nextLine.includes('|') && nextLine.split('|').length >= 3) {
                        continue;
                    }
                }
                // End of table
                if (i - 1 >= tableStart) {
                    tableBlocks.push({ start: tableStart, end: i - 1 });
                }
                tableStart = -1;
            }
        }
    }

    if (tableStart !== -1 && lines.length - 1 >= tableStart) {
        tableBlocks.push({ start: tableStart, end: lines.length - 1 });
    }

    // Extract tables
    const tableLines: number[] = [];
    tableBlocks.forEach(block => {
        const tableLines_block = lines.slice(block.start, block.end + 1).filter(line => {
            const trimmed = line.trim();
            return trimmed.includes('|') && trimmed.split('|').length >= 2;
        });

        if (tableLines_block.length >= 2) {
            // Find separator - more flexible pattern
            let separatorIndex = -1;
            let alignments: ('left' | 'center' | 'right')[] = [];

            for (let i = 0; i < tableLines_block.length; i++) {
                const trimmed = tableLines_block[i].trim();
                // Match separator patterns: |---|---| or |:---|:---:|---:| or | :--- | :--- |
                // Must start and end with |, contain only :, -, |, spaces
                // More flexible: check if line contains mostly dashes and colons between pipes
                if (trimmed.match(/^\|[\s:|-]+\|$/) ||
                    (trimmed.startsWith('|') && trimmed.endsWith('|') &&
                        trimmed.replace(/[\|:\-\s]/g, '').length === 0 &&
                        trimmed.length > 3)) {
                    separatorIndex = i;
                    const parts = trimmed.split('|').filter(p => p.trim());
                    alignments = parts.map(part => {
                        const trimmedPart = part.trim();
                        if (trimmedPart.startsWith(':') && trimmedPart.endsWith(':')) return 'center';
                        if (trimmedPart.endsWith(':')) return 'right';
                        if (trimmedPart.startsWith(':')) return 'left';
                        return 'left';
                    });
                    break;
                }
            }

            const dataLines = tableLines_block.filter((_, idx) => idx !== separatorIndex);
            if (dataLines.length >= 1) {
                // Parse headers
                const headerLine = dataLines[0];
                const headers = headerLine.split('|').map(h => h.trim()).filter(h => h).map(h => h.replace(/^:+|:+$/g, '').trim());

                // Parse rows
                const rows: string[][] = [];
                for (let i = 1; i < dataLines.length; i++) {
                    const cells = dataLines[i].split('|').map(c => c.trim()).filter(c => c);
                    if (cells.length > 0) {
                        while (cells.length < headers.length) {
                            cells.push('');
                        }
                        rows.push(cells.slice(0, headers.length));
                    }
                }

                if (headers.length > 0) {
                    tables.push({
                        headers,
                        rows,
                        alignments: alignments.length > 0 && alignments.length === headers.length
                            ? alignments
                            : headers.map((_, idx) => idx === 0 ? 'left' : 'right'),
                        startLine: block.start,
                        endLine: block.end
                    });

                    // Mark lines as used
                    for (let i = block.start; i <= block.end; i++) {
                        tableLines.push(i);
                    }
                }
            }
        }
    });

    // Build remaining text (excluding table lines)
    const remainingText = lines
        .map((line, idx) => tableLines.includes(idx) ? '' : line)
        .join('\n')
        .replace(/\n\n\n+/g, '\n\n')
        .trim();

    return { tables, remainingText };
};

// Parse bullet lists from content
const parseLists = (content: string): { lists: string[][], remainingText: string } => {
    const lines = content.split(/\r?\n/);
    const lists: string[][] = [];
    const processedLines: { index: number, isList: boolean, listIndex: number }[] = [];

    let currentList: string[] = [];
    let inList = false;
    let listIndex = -1;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const listMatch = line.match(/^\*   (.+)$/);

        if (listMatch) {
            if (!inList) {
                inList = true;
                currentList = [];
                listIndex = lists.length;
                lists.push(currentList);
            }
            currentList.push(listMatch[1]);
            processedLines.push({ index: i, isList: true, listIndex });
        } else {
            if (inList) {
                inList = false;
            }
            processedLines.push({ index: i, isList: false, listIndex: -1 });
        }
    }

    // Build remaining text (lines that are not part of lists)
    const remainingLines: string[] = [];
    for (let i = 0; i < lines.length; i++) {
        const processed = processedLines.find(p => p.index === i);
        if (!processed || !processed.isList) {
            remainingLines.push(lines[i]);
        } else if (processed.isList && processed.listIndex === 0) {
            // Add placeholder for first list item position
            if (i === 0 || lines[i - 1] === '' || !processedLines.find(p => p.index === i - 1)?.isList) {
                remainingLines.push('__LIST_PLACEHOLDER__');
            }
        }
    }

    const remainingText = remainingLines.join('\n').replace(/\n\n\n+/g, '\n\n').trim();

    return { lists, remainingText };
};

// Helper function to render a table in PDF
const renderTable = (
    table: { headers: string[], rows: string[][], alignments: ('left' | 'center' | 'right')[] },
    doc: jsPDF,
    margin: number,
    contentWidth: number,
    pageHeight: number,
    getYPosition: () => number,
    setYPosition: (pos: number) => void,
    addText: (text: string, fontSize?: number, isBold?: boolean, color?: string) => void
) => {
    let yPos = getYPosition();
    const colCount = table.headers.length;
    const colWidth = contentWidth / colCount;
    const rowHeight = 8;
    const headerHeight = 10;

    // Check if we need a new page
    if (yPos + headerHeight + (table.rows.length * rowHeight) > pageHeight - margin - 20) {
        doc.addPage();
        yPos = margin;
        setYPosition(yPos);
    }

    // Draw table header
    let xPos = margin;
    doc.setFillColor(245, 245, 245);
    doc.rect(xPos, yPos - headerHeight, contentWidth, headerHeight, 'F');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);

    table.headers.forEach((header, idx) => {
        const align = table.alignments[idx] || 'left';
        const textX = align === 'right' ? xPos + colWidth - 2 : (align === 'center' ? xPos + colWidth / 2 : xPos + 2);
        doc.text(header, textX, yPos - headerHeight / 2 + 2, { align: align as any });
        xPos += colWidth;
    });

    // Draw header border
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(margin, yPos - headerHeight, margin + contentWidth, yPos - headerHeight);
    doc.line(margin, yPos, margin + contentWidth, yPos);

    yPos += 2;

    // Draw table rows
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    table.rows.forEach((row, rowIdx) => {
        // Check for page break
        if (yPos + rowHeight > pageHeight - margin - 20) {
            doc.addPage();
            yPos = margin + rowHeight;
            setYPosition(yPos);
        }

        xPos = margin;

        // Alternate row background
        if (rowIdx % 2 === 0) {
            doc.setFillColor(250, 250, 250);
            doc.rect(xPos, yPos - rowHeight, contentWidth, rowHeight, 'F');
        }

        row.forEach((cell, idx) => {
            const align = table.alignments[idx] || 'left';
            const textX = align === 'right' ? xPos + colWidth - 2 : (align === 'center' ? xPos + colWidth / 2 : xPos + 2);

            // Check if cell is numeric
            const numericMatch = cell.trim().match(/^[\s\d,.-]+(?:\.\d+)?\s*(RWF)?$/i);
            const isNumeric = numericMatch !== null && idx > 0;

            if (isNumeric) {
                doc.setFont('courier', 'normal');
            } else {
                doc.setFont('helvetica', cell.includes('*') ? 'bold' : 'normal');
            }

            // Clean cell text (remove markdown bold markers)
            let cellText = cell.replace(/\*([^*]+?)\*/g, '$1').trim();

            // Format numbers
            if (isNumeric) {
                const numStr = cellText.replace(/[^\d.-]/g, '');
                if (numStr && !isNaN(parseFloat(numStr))) {
                    cellText = parseFloat(numStr).toLocaleString('en-US');
                    if (cell.includes('RWF')) {
                        cellText += ' RWF';
                    }
                }
            }

            // Split long text to fit column width
            const maxWidth = colWidth - 4;
            const lines = doc.splitTextToSize(cellText, maxWidth);
            const firstLineY = yPos - rowHeight / 2 + 2;

            lines.forEach((line: string, lineIdx: number) => {
                doc.text(line, textX, firstLineY + (lineIdx * 4), { align: align as any });
            });

            // Draw column border
            if (idx < row.length - 1) {
                doc.setDrawColor(220, 220, 220);
                doc.line(xPos + colWidth, yPos - rowHeight, xPos + colWidth, yPos);
            }

            xPos += colWidth;
        });

        // Draw row border
        doc.setDrawColor(220, 220, 220);
        doc.line(margin, yPos, margin + contentWidth, yPos);

        yPos += rowHeight;
    });

    yPos += 5;
    setYPosition(yPos);
};

// Helper function to render a list in PDF
const renderList = (
    items: string[],
    doc: jsPDF,
    margin: number,
    contentWidth: number,
    pageHeight: number,
    getYPosition: () => number,
    setYPosition: (pos: number) => void,
    addText: (text: string, fontSize?: number, isBold?: boolean, color?: string) => void
) => {
    let yPos = getYPosition();
    const bulletIndent = 15;
    const lineHeight = 6;

    items.forEach((item) => {
        // Check for page break
        const itemLines = doc.splitTextToSize(item, contentWidth - bulletIndent);
        if (yPos + (itemLines.length * lineHeight) > pageHeight - margin - 20) {
            doc.addPage();
            yPos = margin;
            setYPosition(yPos);
        }

        // Draw bullet point
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text('•', margin + 5, yPos + 2, { align: 'left' });

        // Draw list item text (left-aligned)
        itemLines.forEach((line: string, lineIdx: number) => {
            doc.text(line, margin + bulletIndent, yPos + (lineIdx * lineHeight), { align: 'left' });
        });
        yPos += itemLines.length * lineHeight + 3;
    });

    yPos += 3;
    setYPosition(yPos);
};

// Main function to render formatted content with tables and lists
const renderFormattedContent = (
    content: string,
    doc: jsPDF,
    margin: number,
    contentWidth: number,
    pageHeight: number,
    getYPosition: () => number,
    setYPosition: (pos: number) => void,
    addText: (text: string, fontSize?: number, isBold?: boolean, color?: string) => void,
    addSectionHeader: (title: string) => void
) => {
    if (!content) return;

    // Strip HTML tags if content contains HTML (from web display)
    let formatted = content;
    // Remove HTML tags but preserve text content
    formatted = formatted.replace(/<[^>]+>/g, '');
    // Decode HTML entities
    formatted = formatted.replace(/&nbsp;/g, ' ');
    formatted = formatted.replace(/&amp;/g, '&');
    formatted = formatted.replace(/&lt;/g, '<');
    formatted = formatted.replace(/&gt;/g, '>');

    // Handle escaped newlines
    formatted = formatted.replace(/\\n/g, '\n');
    const lines = formatted.split(/\r?\n/);

    // Parse all tables first
    const { tables } = parseTables(formatted);
    console.log('[PDF] Content length:', content.length, 'Formatted length:', formatted.length);
    console.log('[PDF] Total lines:', lines.length);
    console.log('[PDF] Tables found:', tables.length);
    if (tables.length > 0) {
        console.log('[PDF] First table:', {
            headers: tables[0].headers,
            rows: tables[0].rows.length,
            startLine: tables[0].startLine,
            endLine: tables[0].endLine
        });
    }

    tables.sort((a, b) => a.startLine - b.startLine);
    const tableLineSet = new Set<number>();
    tables.forEach(table => {
        for (let i = table.startLine; i <= table.endLine; i++) {
            tableLineSet.add(i);
        }
    });

    // Process content line by line, rendering tables and lists in place
    let tableIndex = 0;
    let currentList: string[] = [];
    let inCurrentList = false;
    let i = 0;
    let listCount = 0;

    while (i < lines.length) {
        const line = lines[i];
        const trimmed = line.trim();

        // Check if this line is part of a table
        if (tableLineSet.has(i)) {
            if (tableIndex < tables.length) {
                const table = tables[tableIndex];
                if (i === table.startLine) {
                    // Render the table
                    console.log('[PDF] Rendering table at line', i);
                    renderTable(table, doc, margin, contentWidth, pageHeight, getYPosition, setYPosition, addText);
                    tableIndex++;
                    // Skip all table lines
                    i = table.endLine + 1;
                    continue;
                }
            }
            // If we're in a table but not at the start, skip this line
            i++;
            continue;
        }

        // Check if this is a list item (allow for flexible spacing: *   or *  or *)
        // Match patterns like: "*   item" or "* item" (with optional leading whitespace)
        const listMatch = line.match(/^\s*\*\s+(.+)$/);
        if (listMatch && !tableLineSet.has(i)) {
            if (!inCurrentList) {
                // Close any previous list
                if (currentList.length > 0) {
                    console.log('[PDF] Rendering list with', currentList.length, 'items');
                    renderList(currentList, doc, margin, contentWidth, pageHeight, getYPosition, setYPosition, addText);
                    currentList = [];
                }
                inCurrentList = true;
                listCount++;
            }
            currentList.push(listMatch[1].trim());
            i++;
            continue;
        } else {
            // Not a list item - close current list if any
            if (inCurrentList) {
                if (currentList.length > 0) {
                    console.log('[PDF] Rendering list with', currentList.length, 'items');
                    renderList(currentList, doc, margin, contentWidth, pageHeight, getYPosition, setYPosition, addText);
                    currentList = [];
                }
                inCurrentList = false;
            }
        }

        // Skip empty lines (but add some spacing)
        if (!trimmed) {
            const currentY = getYPosition();
            if (currentY < pageHeight - margin - 30) {
                setYPosition(currentY + 5);
            }
            i++;
            continue;
        }

        // Check if it's a section header
        if (trimmed.match(/^[A-Z][^:\n]+:\s*$/)) {
            addSectionHeader(trimmed.replace(':', '').trim());
            i++;
            continue;
        }

        // Regular text - clean up markdown
        let cleanText = trimmed
            .replace(/\*\*([^*]+?)\*\*/g, '$1')
            .replace(/\*([^*\n]+?)\*/g, '$1');

        // Skip if it's a table or list line that wasn't caught
        if (tableLineSet.has(i) || line.match(/^\s*\*\s+/)) {
            i++;
            continue;
        }

        addText(cleanText, 11);
        i++;
    }

    // Render any remaining list
    if (currentList.length > 0) {
        console.log('[PDF] Rendering final list with', currentList.length, 'items');
        renderList(currentList, doc, margin, contentWidth, pageHeight, getYPosition, setYPosition, addText);
    }

    console.log('[PDF] Finished rendering. Processed', tables.length, 'tables and', listCount, 'lists');
};

interface BusinessIdea {
    id: number;
    title: string;
    description: string;
    industry: string;
    target_market: string;
    initial_investment: number;
    expected_revenue: number;
    success_probability: number;
    status: string;
}

interface BusinessPlan {
    id: number;
    business_idea_id: number;
    executive_summary: string | null;
    market_analysis: string | null;
    financial_projections: string | null;
    marketing_strategy: string | null;
    operations_plan: string | null;
    risk_analysis: string | null;
}

export class PDFService {
    // Generate PDF for business plan
    static async generateBusinessPlanPDF(businessIdea: BusinessIdea, businessPlan: any): Promise<void> {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 20;
        const contentWidth = pageWidth - (margin * 2);
        let yPosition = margin;

        // Helper function to add text with word wrapping
        const addText = (text: string, fontSize: number = 12, isBold: boolean = false, color: string = '#000000') => {
            doc.setFontSize(fontSize);
            doc.setFont('helvetica', isBold ? 'bold' : 'normal');
            // Handle color - if it's a hex string, convert to RGB
            if (typeof color === 'string' && color.startsWith('#')) {
                const r = parseInt(color.slice(1, 3), 16);
                const g = parseInt(color.slice(3, 5), 16);
                const b = parseInt(color.slice(5, 7), 16);
                doc.setTextColor(r, g, b);
            } else {
                doc.setTextColor(0, 0, 0); // Default to black
            }

            const lines = doc.splitTextToSize(text, contentWidth);
            const lineHeight = fontSize * 0.4;

            // Check if we need a new page
            if (yPosition + (lines.length * lineHeight) > pageHeight - margin) {
                doc.addPage();
                yPosition = margin;
            }

            doc.text(lines, margin, yPosition);
            yPosition += lines.length * lineHeight + 5;
        };

        // Helper function to add a section header
        const addSectionHeader = (title: string) => {
            if (yPosition > pageHeight - 40) {
                doc.addPage();
                yPosition = margin;
            }
            addText(title, 16, true, '#2c3e50');
            yPosition += 5;
        };

        // Helper function to format currency
        const formatCurrency = (amount: number) => {
            return new Intl.NumberFormat('en-RW', {
                style: 'currency',
                currency: 'RWF',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
            }).format(amount);
        };

        // Cover Page
        doc.setFillColor(52, 73, 94); // Dark blue background
        doc.rect(0, 0, pageWidth, 60, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('BUSINESS PLAN', pageWidth / 2, 35, { align: 'center' });

        doc.setFontSize(16);
        doc.setFont('helvetica', 'normal');
        doc.text(businessIdea.title, pageWidth / 2, 50, { align: 'center' });

        yPosition = 80;
        doc.setTextColor(0, 0, 0);

        // Business Idea Overview
        addSectionHeader('BUSINESS IDEA OVERVIEW');
        addText(`Title: ${businessIdea.title}`, 14, true);
        addText(`Industry: ${businessIdea.industry}`, 12);
        addText(`Target Market: ${businessIdea.target_market}`, 12);
        addText(`Description: ${businessIdea.description}`, 12);

        // Financial Summary
        addSectionHeader('FINANCIAL SUMMARY');
        addText(`Initial Investment Required: ${formatCurrency(businessIdea.initial_investment)}`, 12, true);
        addText(`Expected Monthly Revenue: ${formatCurrency(businessIdea.expected_revenue)}`, 12, true);
        addText(`Success Probability: ${businessIdea.success_probability}%`, 12, true);
        addText(`Status: ${businessIdea.status}`, 12);

        // Executive Summary
        if (businessPlan.executive_summary) {
            addSectionHeader('EXECUTIVE SUMMARY');
            renderFormattedContent(businessPlan.executive_summary, doc, margin, contentWidth, pageHeight, () => yPosition, (pos) => { yPosition = pos; }, addText, addSectionHeader);
        }

        // Market Analysis
        if (businessPlan.market_analysis) {
            addSectionHeader('MARKET ANALYSIS');
            renderFormattedContent(businessPlan.market_analysis, doc, margin, contentWidth, pageHeight, () => yPosition, (pos) => { yPosition = pos; }, addText, addSectionHeader);
        }

        // Financial Projections
        if (businessPlan.financial_projections) {
            addSectionHeader('FINANCIAL PROJECTIONS');
            renderFormattedContent(businessPlan.financial_projections, doc, margin, contentWidth, pageHeight, () => yPosition, (pos) => { yPosition = pos; }, addText, addSectionHeader);
        }

        // Marketing Strategy
        if (businessPlan.marketing_strategy) {
            addSectionHeader('MARKETING STRATEGY');
            renderFormattedContent(businessPlan.marketing_strategy, doc, margin, contentWidth, pageHeight, () => yPosition, (pos) => { yPosition = pos; }, addText, addSectionHeader);
        }

        // Operations Plan
        if (businessPlan.operations_plan) {
            addSectionHeader('OPERATIONS PLAN');
            renderFormattedContent(businessPlan.operations_plan, doc, margin, contentWidth, pageHeight, () => yPosition, (pos) => { yPosition = pos; }, addText, addSectionHeader);
        }

        // Risk Analysis
        if (businessPlan.risk_analysis) {
            addSectionHeader('RISK ANALYSIS');
            renderFormattedContent(businessPlan.risk_analysis, doc, margin, contentWidth, pageHeight, () => yPosition, (pos) => { yPosition = pos; }, addText, addSectionHeader);
        }

        // Footer
        const totalPages = doc.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFontSize(10);
            doc.setTextColor(128, 128, 128);
            doc.text(`Page ${i} of ${totalPages}`, pageWidth - 30, pageHeight - 10);
            doc.text('Generated by InnoStart Pro', margin, pageHeight - 10);
        }

        // Generate filename
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `BusinessPlan_${businessIdea.title.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.pdf`;

        // Save the PDF
        doc.save(filename);
    }

    static async generateFinancialProjectionPDF(businessIdea: BusinessIdea, financialData: any): Promise<void> {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 20;
        const contentWidth = pageWidth - (margin * 2);
        let yPosition = margin;

        // Helper function to add text with word wrapping
        const addText = (text: string, fontSize: number = 12, isBold: boolean = false, color: string = '#000000') => {
            doc.setFontSize(fontSize);
            doc.setFont('helvetica', isBold ? 'bold' : 'normal');
            doc.setTextColor(color);

            const lines = doc.splitTextToSize(text, contentWidth);
            const lineHeight = fontSize * 0.4;

            if (yPosition + (lines.length * lineHeight) > pageHeight - margin) {
                doc.addPage();
                yPosition = margin;
            }

            doc.text(lines, margin, yPosition);
            yPosition += lines.length * lineHeight + 5;
        };

        // Helper function to add a section header
        const addSectionHeader = (title: string) => {
            if (yPosition > pageHeight - 40) {
                doc.addPage();
                yPosition = margin;
            }
            addText(title, 16, true, '#2c3e50');
            yPosition += 5;
        };

        // Cover Page
        doc.setFillColor(46, 125, 50); // Green background
        doc.rect(0, 0, pageWidth, 60, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('FINANCIAL PROJECTIONS', pageWidth / 2, 35, { align: 'center' });

        doc.setFontSize(16);
        doc.setFont('helvetica', 'normal');
        doc.text(businessIdea.title, pageWidth / 2, 50, { align: 'center' });

        yPosition = 80;
        doc.setTextColor(0, 0, 0);

        // Business Overview
        addSectionHeader('BUSINESS OVERVIEW');
        addText(`Business: ${businessIdea.title}`, 14, true);
        addText(`Industry: ${businessIdea.industry}`, 12);
        addText(`Target Market: ${businessIdea.target_market}`, 12);

        // Financial Data
        if (financialData) {
            addSectionHeader('FINANCIAL PROJECTIONS');
            // If financialData is a string, render it formatted. Otherwise, stringify it.
            const content = typeof financialData === 'string' ? financialData : JSON.stringify(financialData, null, 2);
            renderFormattedContent(content, doc, margin, contentWidth, pageHeight, () => yPosition, (pos) => { yPosition = pos; }, addText, addSectionHeader);
        }

        // Footer
        const totalPages = doc.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFontSize(10);
            doc.setTextColor(128, 128, 128);
            doc.text(`Page ${i} of ${totalPages}`, pageWidth - 30, pageHeight - 10);
            doc.text('Generated by InnoStart Pro', margin, pageHeight - 10);
        }

        // Generate filename
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `FinancialProjection_${businessIdea.title.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.pdf`;

        // Save the PDF
        doc.save(filename);
    }
}
