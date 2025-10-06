import React, { useState, useEffect } from 'react';
import { 
  Typography, Box, Paper, Button, CircularProgress, Alert, Table, TableBody, 
  TableCell, TableContainer, TableHead, TableRow, FormControl, InputLabel, 
  Select, MenuItem, FormControlLabel, Checkbox, Grid, Divider 
} from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import GridOnIcon from '@mui/icons-material/GridOn';
import PrintIcon from '@mui/icons-material/Print';
import FilterListIcon from '@mui/icons-material/FilterList';

// Importa as bibliotecas
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';

// Funções de formatação
const formatCPF = (cpf) => {
  if (!cpf) return '';
  const cleanCPF = cpf.replace(/\D/g, '');
  return cleanCPF.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

const formatPhone = (phone) => {
  if (!phone) return '';
  const cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length === 11) {
    return cleanPhone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  return phone;
};

function ReportsPage() {
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [blocos, setBlocos] = useState([]);
  const [filtros, setFiltros] = useState({
    blocoId: '',
    tipoVinculo: '',
    incluirVeiculos: true
  });

  useEffect(() => {
    const fetchBlocos = async () => {
      const data = await window.api.getAllBlocos();
      setBlocos(data);
    };
    fetchBlocos();
  }, []);

  const handleGenerateReport = async () => {
    setLoading(true);
    setFeedback({ type: '', message: '' });
    
    const filtrosLimpos = {
      blocoId: filtros.blocoId || null,
      tipoVinculo: filtros.tipoVinculo || null,
      incluirVeiculos: filtros.incluirVeiculos
    };
    
    const data = await window.api.getReportData(filtrosLimpos);
    setReportData(data);
    setLoading(false);
    
    if (data.length === 0) {
      setFeedback({ type: 'warning', message: 'Nenhum dado encontrado com os filtros selecionados.' });
    } else {
      setFeedback({ type: 'success', message: `Relatório gerado com ${data.length} registros.` });
    }
  };

  const handleFilterChange = (field, value) => {
    setFiltros(prev => ({ ...prev, [field]: value }));
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    // Título personalizado baseado nos filtros
    let titulo = "Relatório de Moradores";
    if (filtros.blocoId) {
      const bloco = blocos.find(b => b.id == filtros.blocoId);
      titulo += ` - ${bloco?.nome}`;
    }
    if (filtros.tipoVinculo) {
      titulo += ` - ${filtros.tipoVinculo}s`;
    }
    
    doc.text(titulo, 14, 15);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 20);
    doc.text(`Total de registros: ${reportData.length}`, 14, 25);

    // Colunas baseadas nos filtros
    const tableColumn = ["Morador", "Vínculo", "Unidade", "Contatos"];
    if (filtros.incluirVeiculos) {
      tableColumn.push("Veículos");
    }
    
    const tableRows = [];

    reportData.forEach(item => {
      const rowData = [
        `${item.nome_completo}\nCPF: ${formatCPF(item.cpf)}`,
        item.tipo_vinculo,
        `${item.nome_bloco} - ${item.numero_apartamento}`,
        `Tel: ${formatPhone(item.telefone) || ''}\nEmail: ${item.email || ''}`
      ];
      
      if (filtros.incluirVeiculos) {
        const veiculosText = item.veiculos.map(v => `${v.marca} ${v.modelo} (${v.placa})`).join('\n');
        rowData.push(veiculosText || 'Nenhum veículo');
      }
      
      tableRows.push(rowData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 30,
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

    // Define as colunas baseado nos filtros
    const columns = [
      { header: 'Morador', key: 'nome_completo', width: 40 },
      { header: 'CPF', key: 'cpf', width: 20 },
      { header: 'Tipo Vínculo', key: 'tipo_vinculo', width: 20 },
      { header: 'Unidade', key: 'unidade', width: 25 },
      { header: 'Telefone', key: 'telefone', width: 20 },
      { header: 'Email', key: 'email', width: 30 }
    ];
    
    if (filtros.incluirVeiculos) {
      columns.push({ header: 'Veículos', key: 'veiculos', width: 50 });
    }
    
    worksheet.columns = columns;
    
    // Adiciona os dados
    reportData.forEach(item => {
      const rowData = {
        nome_completo: item.nome_completo,
        cpf: formatCPF(item.cpf),
        tipo_vinculo: item.tipo_vinculo,
        unidade: `${item.nome_bloco} - ${item.numero_apartamento}`,
        telefone: formatPhone(item.telefone),
        email: item.email
      };
      
      if (filtros.incluirVeiculos) {
        rowData.veiculos = item.veiculos.map(v => `${v.placa} / ${v.marca} ${v.modelo}`).join('; ');
      }
      
      worksheet.addRow(rowData);
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
        
        {/* Filtros de Personalização */}
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <FilterListIcon sx={{ mr: 1 }} />
            <Typography variant="h6">Filtros do Relatório</Typography>
          </Box>
          
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Bloco</InputLabel>
                <Select
                  value={filtros.blocoId}
                  label="Bloco"
                  onChange={(e) => handleFilterChange('blocoId', e.target.value)}
                >
                  <MenuItem value="">Todos os blocos</MenuItem>
                  {blocos.map(bloco => (
                    <MenuItem key={bloco.id} value={bloco.id}>
                      {bloco.nome}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Tipo de Vínculo</InputLabel>
                <Select
                  value={filtros.tipoVinculo}
                  label="Tipo de Vínculo"
                  onChange={(e) => handleFilterChange('tipoVinculo', e.target.value)}
                >
                  <MenuItem value="">Todos os tipos</MenuItem>
                  <MenuItem value="Proprietário">Proprietário</MenuItem>
                  <MenuItem value="Inquilino">Inquilino</MenuItem>
                  <MenuItem value="Morador">Morador</MenuItem>
                  <MenuItem value="Morador Temporário">Morador Temporário</MenuItem>
                  <MenuItem value="Responsável">Responsável</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={filtros.incluirVeiculos}
                    onChange={(e) => handleFilterChange('incluirVeiculos', e.target.checked)}
                  />
                }
                label="Incluir veículos no relatório"
              />
            </Grid>
          </Grid>
          
          <Divider sx={{ mb: 2 }} />
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            📄 Personalize seu relatório selecionando os filtros desejados acima.
          </Typography>
          
          <Button 
            variant="contained" 
            onClick={handleGenerateReport} 
            disabled={loading}
            size="large"
          >
            {loading ? <CircularProgress size={24} /> : 'Gerar Relatório'}
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
                        <Typography variant="caption" color="text.secondary">CPF: {formatCPF(item.cpf)}</Typography>
                      </TableCell>
                      <TableCell>{item.nome_bloco} - {item.numero_apartamento}</TableCell>
                      <TableCell>
                        <Typography variant="body2">{formatPhone(item.telefone)}</Typography>
                        <Typography variant="caption">{item.email}</Typography>
                      </TableCell>
                      <TableCell>
                        {filtros.incluirVeiculos ? (
                          item.veiculos.length > 0 ? (
                            item.veiculos.map(v => (
                              <Box key={v.id}>
                                <Typography variant="body2">{v.marca} {v.modelo}</Typography>
                                <Typography variant="caption" color="text.secondary">Placa: {v.placa}</Typography>
                              </Box>
                            ))
                          ) : (
                            <Typography variant="caption">Nenhum veículo</Typography>
                          )
                        ) : (
                          <Typography variant="caption">-</Typography>
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