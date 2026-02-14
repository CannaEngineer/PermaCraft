import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import PDFDocument from 'pdfkit';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const farmId = params.id;
  const body = await request.json();

  // Verify farm ownership
  const farm = await db.execute({
    sql: 'SELECT name FROM farms WHERE id = ? AND user_id = ?',
    args: [farmId, session.user.id]
  });

  if (farm.rows.length === 0) {
    return NextResponse.json({ error: 'Farm not found' }, { status: 404 });
  }

  const farmName = farm.rows[0].name as string;

  // Generate PDF
  const pdfBuffer = await generateFarmPlanPDF({
    farmName,
    mapImageDataUrl: body.mapImageDataUrl,
    includeZones: body.includeZones,
    includePlantings: body.includePlantings,
    includePhases: body.includePhases,
    zones: body.zones || [],
    plantings: body.plantings || [],
    phases: body.phases || []
  });

  // Return PDF as downloadable file
  return new NextResponse(pdfBuffer.buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${farmName.replace(/\s+/g, '-')}-${Date.now()}.pdf"`
    }
  });
}

interface PDFExportOptions {
  farmName: string;
  mapImageDataUrl: string;
  includeZones?: boolean;
  includePlantings?: boolean;
  includePhases?: boolean;
  zones?: any[];
  plantings?: any[];
  phases?: any[];
}

async function generateFarmPlanPDF(options: PDFExportOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => {
      const buffer = Buffer.concat(chunks);
      resolve(buffer);
    });
    doc.on('error', reject);

    try {
      // Title page
      doc.fontSize(24).text(options.farmName, { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Farm Plan - ${new Date().toLocaleDateString()}`, { align: 'center' });
      doc.moveDown(2);

      // Map image
      if (options.mapImageDataUrl) {
        const imageData = Buffer.from(
          options.mapImageDataUrl.split(',')[1],
          'base64'
        );

        doc.image(imageData, {
          fit: [500, 400],
          align: 'center'
        });
      }

      doc.addPage();

      // Zones section
      if (options.includeZones && options.zones && options.zones.length > 0) {
        doc.fontSize(18).text('Zones', { underline: true });
        doc.moveDown();

        options.zones.forEach(zone => {
          doc.fontSize(14).text(zone.name || `Zone (${zone.zone_type})`);
          doc.fontSize(10).text(`Type: ${zone.zone_type}`);
          if (zone.properties) {
            try {
              const props = typeof zone.properties === 'string'
                ? JSON.parse(zone.properties)
                : zone.properties;
              if (props.area_acres) {
                doc.fontSize(10).text(`Area: ${props.area_acres.toFixed(2)} acres`);
              }
            } catch (e) {
              // Ignore parsing errors
            }
          }
          doc.moveDown();
        });

        doc.addPage();
      }

      // Plantings section
      if (options.includePlantings && options.plantings && options.plantings.length > 0) {
        doc.fontSize(18).text('Plantings', { underline: true });
        doc.moveDown();

        options.plantings.forEach(planting => {
          doc.fontSize(14).text(planting.name || 'Unnamed Planting');
          if (planting.species_name) {
            doc.fontSize(10).text(`Species: ${planting.species_name}`);
          }
          if (planting.planted_year) {
            doc.fontSize(10).text(`Planted: ${planting.planted_year}`);
          }
          doc.moveDown();
        });

        doc.addPage();
      }

      // Phases section
      if (options.includePhases && options.phases && options.phases.length > 0) {
        doc.fontSize(18).text('Implementation Phases', { underline: true });
        doc.moveDown();

        options.phases.forEach(phase => {
          doc.fontSize(14).text(phase.name);
          if (phase.description) {
            doc.fontSize(10).text(phase.description);
          }
          if (phase.start_date || phase.end_date) {
            const startDate = phase.start_date
              ? new Date(phase.start_date * 1000).toLocaleDateString()
              : '?';
            const endDate = phase.end_date
              ? new Date(phase.end_date * 1000).toLocaleDateString()
              : '?';
            doc.fontSize(10).text(`Timeline: ${startDate} - ${endDate}`);
          }
          doc.moveDown();
        });
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
