import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { AlertTriangle, RefreshCw } from 'lucide-react-native';
import { logger } from '@/src/utils/logger';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logger.error('Caught error in React ErrorBoundary', error, {
      componentStack: errorInfo.componentStack,
    });
    this.props.onError?.(error, errorInfo);
  }

  resetError = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetError);
      }

      return (
        <View className="flex-1 bg-app-bg items-center justify-center p-6">
          <View className="w-full max-w-sm rounded-2xl border border-app-border bg-app-card p-6 shadow-sm">
            <View className="mb-4 h-12 w-12 items-center justify-center rounded-full bg-tag-rose-bg/60 border border-tag-rose-text/20">
              <AlertTriangle size={24} color="#eb5757" />
            </View>

            <Text className="text-app-text text-lg font-semibold tracking-tight mb-1">
              오류가 발생했습니다
            </Text>
            <Text className="text-app-muted text-sm leading-relaxed mb-4">
              화면을 불러오는 중 예기치 않은 문제가 발생했습니다. 다시 시도해 주세요.
            </Text>

            {__DEV__ && (
              <ScrollView
                className="max-h-32 mb-4 rounded-lg bg-app-bg p-3 border border-app-border"
                nestedScrollEnabled
              >
                <Text className="text-tag-rose-text text-xs font-mono">
                  {this.state.error.message}
                </Text>
                {this.state.error.stack && (
                  <Text className="text-app-subtle text-[10px] font-mono mt-1">
                    {this.state.error.stack}
                  </Text>
                )}
              </ScrollView>
            )}

            <TouchableOpacity
              onPress={this.resetError}
              activeOpacity={0.8}
              className="flex-row h-11 items-center justify-center rounded-xl bg-app-text px-4 shadow-sm"
            >
              <RefreshCw size={16} color="#f7f6f3" className="mr-2" />
              <Text className="text-app-bg text-sm font-semibold ml-2">
                다시 시도
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}
