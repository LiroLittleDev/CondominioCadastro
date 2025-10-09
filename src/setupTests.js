// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Polyfill TextEncoder for Jest (Node environment) so browser-only
// libraries (ex: jspdf) that expect TextEncoder are available during tests.
if (typeof global.TextEncoder === 'undefined') {
	// Node's util provides TextEncoder in recent versions
	const { TextEncoder } = require('util');
	global.TextEncoder = TextEncoder;
}

if (typeof global.TextDecoder === 'undefined') {
	// Node's util provides TextDecoder in recent versions
	const { TextDecoder } = require('util');
	global.TextDecoder = TextDecoder;
}

// Provide a lightweight mock for window.api used by renderer code during tests.
// This prevents components from throwing when they call window.api.* in useEffect
// and other lifecycle hooks. Methods return sensible defaults.
if (typeof global.window !== 'undefined') {
	global.window.api = global.window.api || {};

	const defaultApi = {
		// dashboard / search
		getDashboardStats: async () => ({ unidades: 0, pessoas: 0, veiculos: 0 }),
		searchGeral: async () => [],

		// blocos / unidades / pessoas
		getAllBlocos: async () => [],
		getUnidades: async () => [],
		getAllUnidadesDetails: async () => [],
		getFilteredPessoas: async () => [],
		getPessoaDetails: async () => ({}),

		// reports
		getReportData: async () => ({ dados: [], estatisticas: { totalPessoas: 0, totalVinculos: 0, totalVeiculos: 0, porCategoria: [] } }),
		saveReport: async () => ({ success: true, path: '' }),

		// backups / settings
		getBackupSchedule: async () => ({ enabled: false }),
		getDetailedStats: async () => ({}),
		backupData: async () => ({ success: true }),
		importBackup: async () => ({ success: true }),
		setBackupSchedule: async () => ({ success: true }),
		runBackupNow: async () => ({ success: true }),
		clearAllData: async () => ({ success: true, message: 'OK' }),

		// produtos / estoque
		getProdutos: async () => [],
		updateProduto: async () => ({ success: true }),
		deleteProduto: async () => ({ success: true }),

		// movimentações / estoque
		getMovimentacoes: async () => [],
		createMovimentacao: async () => ({ success: true }),
		updateMovimentacao: async () => ({ success: true }),
		deleteMovimentacao: async () => ({ success: true }),

		// veiculos
		getAllVeiculos: async () => [],
		getVeiculosByUnidade: async () => [],
		getVeiculosByPessoa: async () => [],
		deleteVeiculo: async () => ({ success: true }),

		// acordos / movimentacoes
		getReportData: async () => ({ dados: [], estatisticas: {} }),

		// generic utilities
		runSetup: async () => ({ success: true, message: 'ok' }),
		onDataChanged: (cb) => {
			// return unsubscribe
			return () => {};
		},

		// default fallback for any other call
	};

	// assign defaults only for missing keys
	Object.keys(defaultApi).forEach((k) => {
		if (typeof global.window.api[k] === 'undefined') global.window.api[k] = defaultApi[k];
	});

		// Do not provide a proxy fallback: if a method is missing, it remains undefined.
		// This allows code like devLogger to fall back to console.* when appropriate.
}
