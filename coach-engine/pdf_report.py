"""
PDF Report Generator — IA Coach Pro
Generates professional PDF reports using ReportLab.
"""
import os
import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

REPORTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "reports")
os.makedirs(REPORTS_DIR, exist_ok=True)

# Custom colors
GOLD = colors.HexColor("#EAB308")
DARK = colors.HexColor("#18181B")
ZINC = colors.HexColor("#71717A")
SUCCESS = colors.HexColor("#22C55E")
DESTRUCTIVE = colors.HexColor("#EF4444")


def generate_coach_report(user_id: str, insights: dict, games_count: int) -> str:
    """Generate a premium PDF report and return the file path."""
    
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"coach_report_{user_id[:8]}_{timestamp}.pdf"
    filepath = os.path.join(REPORTS_DIR, filename)
    
    doc = SimpleDocTemplate(
        filepath,
        pagesize=A4,
        rightMargin=2*cm,
        leftMargin=2*cm,
        topMargin=2*cm,
        bottomMargin=2*cm
    )
    
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Title'],
        fontSize=28,
        textColor=GOLD,
        spaceAfter=6*mm,
        fontName='Helvetica-Bold'
    )
    
    subtitle_style = ParagraphStyle(
        'CustomSubtitle',
        parent=styles['Normal'],
        fontSize=12,
        textColor=ZINC,
        spaceAfter=4*mm,
        fontName='Helvetica'
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=GOLD,
        spaceBefore=8*mm,
        spaceAfter=4*mm,
        fontName='Helvetica-Bold'
    )
    
    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.black,
        spaceAfter=3*mm,
        leading=14,
        fontName='Helvetica'
    )
    
    small_style = ParagraphStyle(
        'Small',
        parent=styles['Normal'],
        fontSize=8,
        textColor=ZINC,
        fontName='Helvetica'
    )
    
    # Build the story (list of flowables)
    story = []
    
    # === PAGE 1: COVER ===
    story.append(Spacer(1, 4*cm))
    story.append(Paragraph("IA Coach Pro", title_style))
    story.append(Paragraph("Informe de Análisis Profesional", subtitle_style))
    story.append(Spacer(1, 1*cm))
    story.append(HRFlowable(width="60%", thickness=2, color=GOLD))
    story.append(Spacer(1, 1*cm))
    
    overview = insights.get("overview", {})
    meta_data = [
        ["Jugador:", user_id[:12] + "..."],
        ["Partidas Analizadas:", str(games_count)],
        ["ACPL Promedio:", str(overview.get("avg_acpl", "N/A"))],
        ["Título Estimado:", overview.get("estimated_title", "N/A")],
        ["Fecha del Informe:", datetime.datetime.now().strftime("%d/%m/%Y %H:%M")],
        ["Libros en Corpus:", str(insights.get("books_ingested", 0)) + "/20"]
    ]
    
    meta_table = Table(meta_data, colWidths=[5*cm, 10*cm])
    meta_table.setStyle(TableStyle([
        ('TEXTCOLOR', (0, 0), (0, -1), ZINC),
        ('TEXTCOLOR', (1, 0), (1, -1), colors.black),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(meta_table)
    
    story.append(Spacer(1, 2*cm))
    story.append(Paragraph(
        "Este informe ha sido generado localmente por el motor IA Coach Pro "
        "utilizando Stockfish 16.1 y un corpus de 20 libros canónicos de ajedrez.",
        small_style
    ))
    
    story.append(PageBreak())
    
    # === PAGE 2: EXECUTIVE SUMMARY ===
    story.append(Paragraph("1. Resumen Ejecutivo", heading_style))
    story.append(HRFlowable(width="100%", thickness=1, color=GOLD))
    story.append(Spacer(1, 4*mm))
    
    verdict = overview.get("verdict", "Análisis pendiente.")
    story.append(Paragraph(verdict, body_style))
    story.append(Spacer(1, 6*mm))
    
    # Key metrics table
    elo_trend = overview.get("elo_trend", "N/A")
    estimated_title = overview.get("estimated_title", "N/A")
    avg_acpl = overview.get("avg_acpl", "N/A")
    
    metrics_data = [
        ["Métrica", "Valor", "Interpretación"],
        ["Tendencia ELO (30d)", str(elo_trend), "Variación de puntos estimados"],
        ["ACPL Promedio", str(avg_acpl), "Pérdida promedio por jugada (centipeones)"],
        ["Título Estimado", str(estimated_title), "Basado en calidad de jugadas"],
        ["Partidas", str(games_count), "Total de partidas en el análisis"],
    ]
    
    metrics_table = Table(metrics_data, colWidths=[4.5*cm, 3*cm, 8*cm])
    metrics_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), GOLD),
        ('TEXTCOLOR', (0, 0), (-1, 0), DARK),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.lightgrey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#FAFAFA")]),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(metrics_table)
    
    # === PAGE 2 continued: OPENINGS ===
    story.append(Spacer(1, 8*mm))
    story.append(Paragraph("2. Repertorio de Aperturas", heading_style))
    story.append(HRFlowable(width="100%", thickness=1, color=GOLD))
    story.append(Spacer(1, 4*mm))
    
    openings = insights.get("openings", [])
    if openings:
        opening_data = [["Apertura", "Win Rate", "Partidas"]]
        for op in openings:
            opening_data.append([
                op.get("name", ""),
                op.get("winRate", ""),
                str(op.get("games", "-"))
            ])
        
        opening_table = Table(opening_data, colWidths=[7*cm, 4*cm, 4*cm])
        opening_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), GOLD),
            ('TEXTCOLOR', (0, 0), (-1, 0), DARK),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.lightgrey),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        story.append(opening_table)
    
    story.append(PageBreak())
    
    # === PAGE 3: TACTICS ===
    story.append(Paragraph("3. Análisis Táctico", heading_style))
    story.append(HRFlowable(width="100%", thickness=1, color=GOLD))
    story.append(Spacer(1, 4*mm))
    
    tactics = insights.get("tactics", {})
    story.append(Paragraph(
        f"<b>Presión en el Centro:</b> {tactics.get('center_pressure', 'N/A')}", body_style
    ))
    story.append(Paragraph(
        f"<b>Ataques a Descubierto:</b> {tactics.get('discovered_attacks', 'N/A')}", body_style
    ))
    story.append(Paragraph(
        f"<b>Tácticas de Ataque Doble Perdidas:</b> {tactics.get('missed_double_attacks', 'N/A')}", body_style
    ))
    
    # === PAGE 3 continued: ENDGAME ===
    story.append(Spacer(1, 8*mm))
    story.append(Paragraph("4. Técnica de Finales", heading_style))
    story.append(HRFlowable(width="100%", thickness=1, color=GOLD))
    story.append(Spacer(1, 4*mm))
    
    endgame = insights.get("endgame", {})
    story.append(Paragraph(
        f"<b>Precisión en Finales:</b> {endgame.get('precision', 'N/A')}%", body_style
    ))
    story.append(Paragraph(
        f"<b>Debilidad Principal:</b> {endgame.get('weakness', 'N/A')}", body_style
    ))
    story.append(Paragraph(
        f"<b>Lección Recomendada:</b> {endgame.get('recommended_lesson', 'N/A')}", body_style
    ))
    if endgame.get("book_reference"):
        story.append(Paragraph(
            f"<b>Referencia Bibliográfica:</b> {endgame['book_reference']}", body_style
        ))
    
    # === FOOTER: PLAN ===
    story.append(Spacer(1, 1*cm))
    story.append(Paragraph("5. Plan de Entrenamiento Recomendado", heading_style))
    story.append(HRFlowable(width="100%", thickness=1, color=GOLD))
    story.append(Spacer(1, 4*mm))
    
    plan_items = [
        "Semana 1-2: Resolver 20 problemas tácticos diarios enfocados en doble ataque y clavadas.",
        "Semana 2-3: Estudiar finales de peones (oposición, triangulación, cuadrado).",
        "Semana 3-4: Revisar repertorio de aperturas y preparar variantes específicas contra tus líneas más débiles.",
        "Continuo: Analizar cada partida post-mortem con el motor local antes de jugar la siguiente."
    ]
    
    for i, item in enumerate(plan_items, 1):
        story.append(Paragraph(f"<b>{i}.</b> {item}", body_style))
    
    # Final note
    story.append(Spacer(1, 1*cm))
    story.append(HRFlowable(width="40%", thickness=1, color=ZINC))
    story.append(Spacer(1, 4*mm))
    story.append(Paragraph(
        "Generado por IA Coach Pro • Motor Stockfish 16.1 • Localhost • Costo: $0",
        ParagraphStyle('Footer', parent=small_style, alignment=TA_CENTER)
    ))
    
    # Build PDF
    doc.build(story)
    return filepath
