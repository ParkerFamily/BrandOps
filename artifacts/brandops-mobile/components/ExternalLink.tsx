import * as WebBrowser from 'expo-web-browser';
import type { ComponentProps } from 'react';
import { Platform, Pressable } from 'react-native';

export function ExternalLink(props: Omit<ComponentProps<typeof Pressable>, 'onPress'> & { href: string; children: React.ReactNode }) {
  return (
    <Pressable
      {...props}
      onPress={(e) => {
        if (Platform.OS !== 'web') {
          e.preventDefault?.();
          WebBrowser.openBrowserAsync(props.href);
          return;
        }
        // On web, allow the browser to handle it.
        window.open(props.href, '_blank', 'noopener,noreferrer');
      }}
    >
      {props.children}
    </Pressable>
  );
}
