import React, { useState } from 'react';
import { Typography, Box, Paper, Button, CircularProgress, Alert, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import GridOnIcon from '@mui/icons-material/GridOn';
import PrintIcon from '@mui/icons-material/Print';

// Importa as bibliotecas
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';

function ReportsPage() {
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const handleGenerateReport = async () => {
    setLoading(true);
    setFeedback({ type: '', message: '' });
    const data = await window.api.getReportData();
    setReportData(data);
    setLoading(false);
    if (data.length === 0) {
      setFeedback({ type: 'warning', message: 'Nenhum dado encontrado para gerar o relatório.' });
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text("Relatório de Moradores e Veículos", 14, 15);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 20);

    const tableColumn = ["Morador", "Unidade", "Contatos", "Veículos"];
    const tableRows = [];

    reportData.forEach(item => {
      const veiculosText = item.veiculos.map(v => `${v.marca} ${v.modelo} (Placa: ${v.placa})`).join('\n');
      const rowData = [
        `${item.nome_completo}\nCPF: ${item.cpf}`,
        `${item.nome_bloco} - ${item.numero_apartamento}`,
        `Tel: ${item.telefone || ''}\nEmail: ${item.email || ''}`,
        veiculosText || 'Nenhum veículo',
      ];
      tableRows.push(rowData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 25,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] }
    });
    
    // Salva o arquivo PDF
    window.api.saveReport({
      filters: [{ name: 'Documentos PDF', extensions: ['pdf'] }],
      data: doc.output('arraybuffer'),
      format: 'pdf'
    }).then(result => {
      if (result.success) {
        setFeedback({ type: 'success', message: `Relatório salvo em: ${result.path}`});
      }
    }).catch(error => {
      setFeedback({ type: 'error', message: 'Erro ao salvar PDF' });
    });
  };

  const handleExportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Relatório de Moradores");

    // Define as colunas
    worksheet.columns = [
      { header: 'Morador', key: 'nome_completo', width: 40 },
      { header: 'CPF', key: 'cpf', width: 20 },
      { header: 'Unidade', key: 'unidade', width: 25 },
      { header: 'Telefone', key: 'telefone', width: 20 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Veículos', key: 'veiculos', width: 50 },
    ];
    
    // Adiciona os dados
    reportData.forEach(item => {
      worksheet.addRow({
        nome_completo: item.nome_completo,
        cpf: item.cpf,
        unidade: `${item.nome_bloco} - ${item.numero_apartamento}`,
        telefone: item.telefone,
        email: item.email,
        veiculos: item.veiculos.map(v => `${v.placa} / ${v.marca} ${v.modelo}`).join('; ')
      });
    });

    // Gera o buffer do arquivo
    const buffer = await workbook.xlsx.writeBuffer();
    
    // Salva o arquivo
    window.api.saveReport({
      filters: [{ name: 'Planilhas Excel', extensions: ['xlsx'] }],
      data: buffer,
      format: 'xlsx'
    }).then(result => {
      if (result.success) {
        setFeedback({ type: 'success', message: `Relatório salvo em: ${result.path}`});
      }
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Box>
      {/* Área não impressa */}
      <Box className="no-print">
        <Typography variant="h4" gutterBottom>
          Gerador de Relatórios
        </Typography>
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6">Relatório de Moradores e Veículos</Typography>
          <Typography paragraph color="text.secondary">
            Gere um arquivo PDF ou Excel com a lista de moradores, contatos e veículos.
          </Typography>
          <Button variant="contained" onClick={handleGenerateReport} disabled={loading}>
            {loading ? <CircularProgress size={24} /> : '1. Buscar Dados'}
          </Button>

          {/* Botões de exportação */}
          {reportData.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Button variant="outlined" startIcon={<PictureAsPdfIcon />} onClick={handleExportPDF} sx={{ mr: 2 }}>
                Exportar PDF
              </Button>
              <Button variant="outlined" startIcon={<GridOnIcon />} onClick={handleExportExcel} sx={{ mr: 2 }}>
                Exportar Excel
              </Button>
              <Button variant="outlined" startIcon={<PrintIcon />} onClick={handlePrint}>
                Imprimir
              </Button>
            </Box>
          )}
          {feedback.message && <Alert severity={feedback.type} sx={{ mt: 2 }}>{feedback.message}</Alert>}
        </Paper>
      </Box>

      {/* Área impressa */}
      {reportData.length > 0 && (
        <Box className="printable-area">
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>Relatório de Moradores e Veículos</Typography>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Gerado em: {new Date().toLocaleString('pt-BR')}
            </Typography>
            
            <TableContainer sx={{ mt: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Morador</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Unidade</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Contatos</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Veículos</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reportData.map((item) => (
                    <TableRow key={item.pessoa_id}>
                      <TableCell>
                        <Typography variant="body2">{item.nome_completo}</Typography>
                        <Typography variant="caption" color="text.secondary">CPF: {item.cpf}</Typography>
                      </TableCell>
                      <TableCell>{item.nome_bloco} - {item.numero_apartamento}</TableCell>
                      <TableCell>
                        <Typography variant="body2">{item.telefone}</Typography>
                        <Typography variant="caption">{item.email}</Typography>
                      </TableCell>
                      <TableCell>
                        {item.veiculos.length > 0 ? (
                          item.veiculos.map(v => (
                            <Box key={v.id}>
                              <Typography variant="body2">{v.marca} {v.modelo}</Typography>
                              <Typography variant="caption" color="text.secondary">Placa: {v.placa}</Typography>
                            </Box>
                          ))
                        ) : (
                          <Typography variant="caption">Nenhum veículo</Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      )}

      <style type="text/css">
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            .printable-area, .printable-area * {
              visibility: visible;
            }
            .printable-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
            .no-print {
              display: none !important;
            }
            .printable-area .MuiPaper-root {
              box-shadow: none !important;
              background-color: transparent !important;
            }
            .printable-area * {
              color: #000 !important;
            }
          }
        `}
      </style>
    </Box>
  );
}

export default ReportsPage;