import devLogger from '../../utils/devLogger';

describe('devLogger', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test('debug uses console.debug if available', () => {
    const spy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    devLogger.debug('msg');
    expect(spy).toHaveBeenCalled();
  });

  test('debug falls back to console.log if debug not available', () => {
    const originalDebug = console.debug;
    try {
      // Simular ambiente sem console.debug
      // @ts-ignore
      console.debug = undefined;
      const spyLog = jest.spyOn(console, 'log').mockImplementation(() => {});
      devLogger.debug('msg2');
      expect(spyLog).toHaveBeenCalled();
      spyLog.mockRestore();
    } finally {
      // restaurar
      console.debug = originalDebug;
    }
  });
});
