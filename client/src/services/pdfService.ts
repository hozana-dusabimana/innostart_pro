import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
            doc.setTextColor(color);

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
            addText(businessPlan.executive_summary, 12);
        }

        // Market Analysis
        if (businessPlan.market_analysis) {
            addSectionHeader('MARKET ANALYSIS');
            addText(businessPlan.market_analysis, 12);
        }

        // Financial Projections
        if (businessPlan.financial_projections) {
            addSectionHeader('FINANCIAL PROJECTIONS');
            addText(businessPlan.financial_projections, 12);
        }

        // Marketing Strategy
        if (businessPlan.marketing_strategy) {
            addSectionHeader('MARKETING STRATEGY');
            addText(businessPlan.marketing_strategy, 12);
        }

        // Operations Plan
        if (businessPlan.operations_plan) {
            addSectionHeader('OPERATIONS PLAN');
            addText(businessPlan.operations_plan, 12);
        }

        // Risk Analysis
        if (businessPlan.risk_analysis) {
            addSectionHeader('RISK ANALYSIS');
            addText(businessPlan.risk_analysis, 12);
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
            addText(JSON.stringify(financialData, null, 2), 10);
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
