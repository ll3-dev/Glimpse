import React, { useEffect, useRef } from 'react';
import { Animated, Text, View, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react-native';
import { useToastStore } from '@/src/stores/toast.store';

export function Toast() {
  const { currentToast, hideToast } = useToastStore();
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    if (currentToast) {
      // Animate in
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        // Animate out
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 180,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: -20,
            duration: 180,
            useNativeDriver: true,
          }),
        ]).start(() => {
          hideToast();
        });
      }, currentToast.durationMs ?? 2500);

      return () => clearTimeout(timer);
    } else {
      opacity.setValue(0);
      translateY.setValue(-20);
    }
  }, [currentToast, hideToast, opacity, translateY]);

  if (!currentToast) return null;

  const getIcon = () => {
    switch (currentToast.type) {
      case 'success':
        return <CheckCircle2 size={16} color="#1a7f37" />;
      case 'error':
        return <AlertCircle size={16} color="#eb5757" />;
      case 'info':
      default:
        return <Info size={16} color="#2383e2" />;
    }
  };

  return (
    <Animated.View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        top: Math.max(insets.top + 8, 16),
        left: 20,
        right: 20,
        zIndex: 9999,
        opacity,
        transform: [{ translateY }],
        alignItems: 'center',
      }}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={hideToast}
        className="flex-row items-center bg-[#37352f] px-4 py-2.5 rounded-full shadow-lg border border-white/10 max-w-[92%]"
      >
        <View className="mr-2">{getIcon()}</View>
        <Text className="text-white text-xs font-medium tracking-tight flex-shrink mr-2" numberOfLines={2}>
          {currentToast.message}
        </Text>
        <X size={13} color="#9b9a97" />
      </TouchableOpacity>
    </Animated.View>
  );
}
