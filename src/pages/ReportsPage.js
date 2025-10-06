import React, { useState, useEffect } from 'react';
import { 
  Typography, Box, Paper, Button, CircularProgress, Alert, Table, TableBody, 
  TableCell, TableContainer, TableHead, TableRow, FormControl, InputLabel, 
  Select, MenuItem, FormControlLabel, Checkbox, Grid, Divider, TextField 
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
  const [reportData, setReportData] = useState({ dados: [], estatisticas: { totalPessoas: 0, totalVinculos: 0, totalVeiculos: 0, porCategoria: [] } });
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [blocos, setBlocos] = useState([]);
  const [filtros, setFiltros] = useState({
    blocoId: '',
    tipoVinculo: '',
    entrada: '',
    busca: '',
    apenasComVeiculos: false,
    apenasSemVeiculos: false,
    ordenacao: 'nome',
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
      entrada: filtros.entrada || null,
      busca: filtros.busca || null,
      apenasComVeiculos: filtros.apenasComVeiculos,
      apenasSemVeiculos: filtros.apenasSemVeiculos,
      ordenacao: filtros.ordenacao,
      incluirVeiculos: filtros.incluirVeiculos
    };
    
    const response = await window.api.getReportData(filtrosLimpos);
    setReportData(response);
    setLoading(false);
    
    if (!response.dados || response.dados.length === 0) {
      setFeedback({ type: 'warning', message: 'Nenhum dado encontrado com os filtros selecionados.' });
    } else {
      setFeedback({ type: 'success', message: `Relatório gerado com ${response.dados.length} registros.` });
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
      const bloco = blocos.find(b => b.id === filtros.blocoId);
      titulo += ` - ${bloco?.nome}`;
    }
    if (filtros.tipoVinculo) {
      titulo += ` - ${filtros.tipoVinculo}s`;
    }
    
    doc.text(titulo, 14, 15);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 20);
    doc.text(`Total de registros: ${reportData.dados.length}`, 14, 25);
    doc.text(`Pessoas únicas: ${reportData.estatisticas.totalPessoas}`, 14, 30);
    doc.text(`Total vínculos: ${reportData.estatisticas.totalVinculos}`, 14, 35);
    doc.text(`Total veículos: ${reportData.estatisticas.totalVeiculos}`, 14, 40);
    
    // Adicionar estatísticas por categoria
    let yPos = 45;
    if (reportData.estatisticas.porCategoria.length > 0) {
      doc.text('Por categoria:', 14, yPos);
      yPos += 5;
      reportData.estatisticas.porCategoria.forEach(cat => {
        doc.text(`${cat.tipo_vinculo}: ${cat.quantidade}`, 20, yPos);
        yPos += 4;
      });
    }

    // Colunas baseadas nos filtros
    const tableColumn = ["Morador", "Vínculo", "Unidade", "Contatos"];
    if (filtros.incluirVeiculos) {
      tableColumn.push("Veículos");
    }
    
    const tableRows = [];

    reportData.dados.forEach(item => {
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
      startY: yPos + 5,
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
    
    // Adicionar estatísticas no topo
    worksheet.addRow(['ESTATÍSTICAS DO RELATÓRIO']);
    worksheet.addRow(['Pessoas únicas:', reportData.estatisticas.totalPessoas]);
    worksheet.addRow(['Total vínculos:', reportData.estatisticas.totalVinculos]);
    worksheet.addRow(['Total veículos:', reportData.estatisticas.totalVeiculos]);
    worksheet.addRow([]);
    
    if (reportData.estatisticas.porCategoria.length > 0) {
      worksheet.addRow(['POR CATEGORIA:']);
      reportData.estatisticas.porCategoria.forEach(cat => {
        worksheet.addRow([cat.tipo_vinculo, cat.quantidade]);
      });
      worksheet.addRow([]);
    }
    
    worksheet.addRow(['DADOS DETALHADOS:']);
    worksheet.addRow([]);
    
    // Adiciona os dados
    reportData.dados.forEach(item => {
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
            <Grid item xs={12} sm={3}>
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
            
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth>
                <InputLabel>Tipo de Vínculo</InputLabel>
                <Select
                  value={filtros.tipoVinculo}
                  label="Tipo de Vínculo"
                  onChange={(e) => handleFilterChange('tipoVinculo', e.target.value)}
                >
                  <MenuItem value="">Todos os tipos</MenuItem>
                  <MenuItem value="Proprietários">Proprietários (Ambos)</MenuItem>
                  <MenuItem value="Proprietário">Proprietário (Não Reside)</MenuItem>
                  <MenuItem value="Proprietário Morador">Proprietário Morador</MenuItem>
                  <MenuItem value="Inquilino">Inquilino</MenuItem>
                  <MenuItem value="Morador">Morador</MenuItem>
                  <MenuItem value="Morador Temporário">Morador Temporário</MenuItem>
                  <MenuItem value="Responsável">Responsável</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth>
                <InputLabel>Entrada</InputLabel>
                <Select
                  value={filtros.entrada}
                  label="Entrada"
                  onChange={(e) => handleFilterChange('entrada', e.target.value)}
                >
                  <MenuItem value="">Todas as entradas</MenuItem>
                  <MenuItem value="A">Entrada A</MenuItem>
                  <MenuItem value="B">Entrada B</MenuItem>
                  <MenuItem value="C">Entrada C</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth>
                <InputLabel>Ordenar por</InputLabel>
                <Select
                  value={filtros.ordenacao}
                  label="Ordenar por"
                  onChange={(e) => handleFilterChange('ordenacao', e.target.value)}
                >
                  <MenuItem value="nome">Nome</MenuItem>
                  <MenuItem value="unidade">Unidade</MenuItem>
                  <MenuItem value="categoria">Categoria</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Buscar por nome, CPF ou email"
                value={filtros.busca}
                onChange={(e) => handleFilterChange('busca', e.target.value)}
                size="small"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={filtros.incluirVeiculos}
                      onChange={(e) => handleFilterChange('incluirVeiculos', e.target.checked)}
                      size="small"
                    />
                  }
                  label="Incluir veículos"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={filtros.apenasComVeiculos}
                      onChange={(e) => handleFilterChange('apenasComVeiculos', e.target.checked)}
                      size="small"
                    />
                  }
                  label="Apenas com veículos"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={filtros.apenasSemVeiculos}
                      onChange={(e) => handleFilterChange('apenasSemVeiculos', e.target.checked)}
                      size="small"
                    />
                  }
                  label="Apenas sem veículos"
                />
              </Box>
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
          {reportData.dados && reportData.dados.length > 0 && (
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
      {reportData.dados && reportData.dados.length > 0 && (
        <Box className="printable-area">
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>Relatório de Moradores e Veículos</Typography>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Gerado em: {new Date().toLocaleString('pt-BR')}
            </Typography>
            
            {/* Estatísticas do Relatório */}
            <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="h6" gutterBottom>Resumo do Relatório</Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={2}>
                  <Typography variant="body2" color="text.secondary">Pessoas Únicas:</Typography>
                  <Typography variant="h6" color="primary">{reportData.estatisticas.totalPessoas}</Typography>
                </Grid>
                <Grid item xs={6} sm={2}>
                  <Typography variant="body2" color="text.secondary">Total Vínculos:</Typography>
                  <Typography variant="h6" color="info.main">{reportData.estatisticas.totalVinculos}</Typography>
                </Grid>
                <Grid item xs={6} sm={2}>
                  <Typography variant="body2" color="text.secondary">Total Veículos:</Typography>
                  <Typography variant="h6" color="secondary">{reportData.estatisticas.totalVeiculos}</Typography>
                </Grid>
                {reportData.estatisticas.porCategoria.length > 0 && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>Por Categoria:</Typography>
                    {reportData.estatisticas.porCategoria.map(cat => (
                      <Typography key={cat.tipo_vinculo} variant="body2">
                        {cat.tipo_vinculo}: <strong>{cat.quantidade}</strong>
                      </Typography>
                    ))}
                  </Grid>
                )}
              </Grid>
            </Box>
            
            <TableContainer sx={{ mt: 2 }}>
              <Table size="small" sx={{ '& .MuiTableCell-root': { py: 0.5, fontSize: '0.75rem' } }}>
                <TableHead>
                  <TableRow sx={{ '& .MuiTableCell-root': { fontWeight: 'bold', fontSize: '0.8rem', py: 1 } }}>
                    <TableCell>Morador</TableCell>
                    <TableCell>Unidade</TableCell>
                    <TableCell>Contatos</TableCell>
                    {filtros.incluirVeiculos && <TableCell>Veículos</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reportData.dados.map((item) => (
                    <TableRow key={item.vinculo_id} sx={{ '& .MuiTableCell-root': { borderBottom: '1px solid #e0e0e0' } }}>
                      <TableCell sx={{ minWidth: 120 }}>
                        <Typography variant="body2" sx={{ fontSize: '0.75rem', fontWeight: 500 }}>
                          {item.nome_completo}
                        </Typography>
                        <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary', display: 'block' }}>
                          {formatCPF(item.cpf)}
                        </Typography>
                        <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'primary.main', display: 'block' }}>
                          {item.tipo_vinculo}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.75rem', minWidth: 80 }}>
                        {item.nome_bloco} - {item.numero_apartamento}
                      </TableCell>
                      <TableCell sx={{ minWidth: 100 }}>
                        <Typography variant="caption" sx={{ fontSize: '0.65rem', display: 'block' }}>
                          {formatPhone(item.telefone)}
                        </Typography>
                        <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
                          {item.email}
                        </Typography>
                      </TableCell>
                      {filtros.incluirVeiculos && (
                        <TableCell sx={{ minWidth: 100 }}>
                          {item.veiculos.length > 0 ? (
                            item.veiculos.map(v => (
                              <Typography key={v.id} variant="caption" sx={{ fontSize: '0.65rem', display: 'block' }}>
                                {v.marca} {v.modelo} ({v.placa})
                              </Typography>
                            ))
                          ) : (
                            <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
                              Sem veículo
                            </Typography>
                          )}
                        </TableCell>
                      )}
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
            @page {
              margin: 0.5in;
              size: A4;
            }
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
              padding: 8px !important;
            }
            .printable-area * {
              color: #000 !important;
            }
            .printable-area .MuiTableCell-root {
              padding: 2px 4px !important;
              font-size: 10px !important;
              line-height: 1.2 !important;
            }
            .printable-area .MuiTypography-h5 {
              font-size: 16px !important;
              margin-bottom: 8px !important;
            }
            .printable-area .MuiTypography-h6 {
              font-size: 12px !important;
              margin-bottom: 4px !important;
            }
            .printable-area .MuiBox-root {
              margin-bottom: 8px !important;
            }
          }
        `}
      </style>
    </Box>
  );
}

export default ReportsPage;