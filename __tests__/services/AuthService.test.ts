import AsyncStorage from '@react-native-async-storage/async-storage';
import { Buffer } from 'buffer';

// Import after mocks are set up (jest.setup.js handles AsyncStorage mock)
import * as AuthService from '@/services/AuthService';

const MAC = 'AA:BB:CC:DD:EE:FF';
const TOKEN = Buffer.from('0123456789abcdef0123456789abcdef', 'hex');

beforeEach(() => {
  jest.clearAllMocks();
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
});

describe('AuthService', () => {
  describe('storeSession', () => {
    it('stores a new device session', async () => {
      await AuthService.storeSession(MAC, TOKEN, 'MyTank');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@watertank_auth',
        expect.any(String),
      );
      const setCall = (AsyncStorage.setItem as jest.Mock).mock.calls[0][1];
      const parsed = JSON.parse(setCall);
      expect(parsed[MAC]).toEqual({
        token: TOKEN.toString('hex'),
        deviceName: 'MyTank',
      });
    });

    it('adds to existing sessions without overwriting others', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({
          '11:22:33:44:55:66': { token: 'existing', deviceName: 'Old' },
        }),
      );
      await AuthService.storeSession(MAC, TOKEN, 'MyTank');
      const setCall = (AsyncStorage.setItem as jest.Mock).mock.calls[0][1];
      const parsed = JSON.parse(setCall);
      expect(Object.keys(parsed)).toHaveLength(2);
      expect(parsed['11:22:33:44:55:66'].token).toBe('existing');
      expect(parsed[MAC].deviceName).toBe('MyTank');
    });
  });

  describe('getSession', () => {
    it('returns session for known device', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({
          [MAC]: { token: TOKEN.toString('hex'), deviceName: 'MyTank' },
        }),
      );
      const session = await AuthService.getSession(MAC);
      expect(session).not.toBeNull();
      expect(session!.deviceName).toBe('MyTank');
      expect(session!.token).toBe(TOKEN.toString('hex'));
    });

    it('returns null for unknown device', async () => {
      const session = await AuthService.getSession('FF:FF:FF:FF:FF:FF');
      expect(session).toBeNull();
    });

    it('returns null when storage is empty', async () => {
      const session = await AuthService.getSession(MAC);
      expect(session).toBeNull();
    });
  });

  describe('clearSession', () => {
    it('removes a specific device while keeping others', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({
          [MAC]: { token: 'test', deviceName: 'Tank' },
          '11:22:33:44:55:66': { token: 'other', deviceName: 'Other' },
        }),
      );
      await AuthService.clearSession(MAC);
      const setCall = (AsyncStorage.setItem as jest.Mock).mock.calls[0][1];
      const parsed = JSON.parse(setCall);
      expect(parsed[MAC]).toBeUndefined();
      expect(parsed['11:22:33:44:55:66']).toBeDefined();
    });
  });

  describe('clearAllSessions', () => {
    it('removes the entire auth key from storage', async () => {
      await AuthService.clearAllSessions();
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@watertank_auth');
    });
  });

  describe('listSessions', () => {
    it('returns empty array when no sessions exist', async () => {
      const sessions = await AuthService.listSessions();
      expect(sessions).toEqual([]);
    });

    it('returns all stored devices as StoredDevice array', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({
          [MAC]: { token: 'tok1', deviceName: 'Tank1' },
          '11:22:33:44:55:66': { token: 'tok2', deviceName: 'Tank2' },
        }),
      );
      const sessions = await AuthService.listSessions();
      expect(sessions).toHaveLength(2);
      expect(sessions[0]).toHaveProperty('deviceMac');
      expect(sessions[0]).toHaveProperty('token');
      expect(sessions[0]).toHaveProperty('deviceName');
    });
  });

  describe('error handling', () => {
    it('handles corrupt JSON data gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('not-valid-json');
      const result = await AuthService.getSession(MAC);
      expect(result).toBeNull();
    });
  });
});
