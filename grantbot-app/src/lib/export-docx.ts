import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Packer,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
} from "docx";

type ProposalSection = {
  title: string;
  content: string | null;
};

type ProposalData = {
  organizationName: string;
  opportunityName: string;
  sections: ProposalSection[];
  metadata?: {
    createdAt?: string;
    ownerName?: string;
    status?: string;
  };
};

export async function generateProposalDOCX(proposal: ProposalData): Promise<Blob> {
  const children: (Paragraph | Table)[] = [];

  // Title page
  children.push(
    new Paragraph({
      text: proposal.organizationName,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    })
  );

  children.push(
    new Paragraph({
      text: "Grant Proposal",
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    })
  );

  children.push(
    new Paragraph({
      text: proposal.opportunityName,
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );

  // Metadata table
  if (proposal.metadata) {
    const metadataRows: TableRow[] = [];

    if (proposal.metadata.createdAt) {
      const date = new Date(proposal.metadata.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      metadataRows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ text: "Date:", bold: true })],
              width: { size: 25, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              children: [new Paragraph({ text: date })],
              width: { size: 75, type: WidthType.PERCENTAGE },
            }),
          ],
        })
      );
    }

    if (proposal.metadata.ownerName) {
      metadataRows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ text: "Prepared by:", bold: true })],
              width: { size: 25, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              children: [new Paragraph({ text: proposal.metadata.ownerName })],
              width: { size: 75, type: WidthType.PERCENTAGE },
            }),
          ],
        })
      );
    }

    if (proposal.metadata.status) {
      metadataRows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ text: "Status:", bold: true })],
              width: { size: 25, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              children: [new Paragraph({ text: proposal.metadata.status })],
              width: { size: 75, type: WidthType.PERCENTAGE },
            }),
          ],
        })
      );
    }

    if (metadataRows.length > 0) {
      children.push(
        new Table({
          rows: metadataRows,
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1 },
            bottom: { style: BorderStyle.SINGLE, size: 1 },
            left: { style: BorderStyle.SINGLE, size: 1 },
            right: { style: BorderStyle.SINGLE, size: 1 },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
            insideVertical: { style: BorderStyle.SINGLE, size: 1 },
          },
        })
      );

      children.push(
        new Paragraph({
          text: "",
          spacing: { after: 400 },
        })
      );
    }
  }

  // Sections
  for (const section of proposal.sections) {
    // Section heading
    children.push(
      new Paragraph({
        text: section.title,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 },
        shading: {
          fill: "2962FF",
          color: "FFFFFF",
        },
      })
    );

    // Section content
    if (section.content && section.content.trim()) {
      const paragraphs = section.content.split("\n\n");

      for (const paragraphText of paragraphs) {
        if (paragraphText.trim()) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: paragraphText.trim(),
                  size: 22, // 11pt (size is in half-points)
                }),
              ],
              spacing: { after: 200 },
              alignment: AlignmentType.JUSTIFIED,
            })
          );
        }
      }
    } else {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "[Content pending]",
              italics: true,
              color: "999999",
            }),
          ],
          spacing: { after: 200 },
        })
      );
    }
  }

  // Footer
  children.push(
    new Paragraph({
      text: "",
      spacing: { before: 600 },
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "Generated by GrantBot",
          size: 18,
          color: "999999",
        }),
      ],
      alignment: AlignmentType.CENTER,
      border: {
        top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      },
      spacing: { before: 200 },
    })
  );

  // Create document
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch = 1440 twips
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children,
      },
    ],
  });

  // Generate blob
  const blob = await Packer.toBlob(doc);
  return blob;
}

export function downloadDOCX(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
