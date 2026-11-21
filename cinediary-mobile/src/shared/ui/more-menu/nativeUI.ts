import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

/**
 * Se o binário tem o `@expo/ui` (development build ou loja). O import dele já busca as views nativas, então num
 * binário sem ele (um Expo Go sem o módulo, por exemplo) quebraria a tela: os arquivos nativos só são carregados
 * se isto for `true`; senão, fica o menu do próprio app (`ActionSheet`).
 */
export const hasNativeUI = Platform.OS !== 'web' && requireOptionalNativeModule('ExpoUI') != null;
