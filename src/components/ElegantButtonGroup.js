import React from 'react';
import { View, StyleSheet } from 'react-native';
import ElegantButton from './ElegantButton';

/**
 * Elegant Button Group
 * Displays multiple elegant buttons in a refined layout
 */
const ElegantButtonGroup = ({
  buttons,
  layout = 'horizontal', // horizontal, vertical, grid
  spacing = 12,
  style,
}) => {
  const getContainerStyle = () => {
    const baseStyle = [styles.container];
    
    switch (layout) {
      case 'horizontal':
        baseStyle.push(styles.horizontal);
        break;
      case 'vertical':
        baseStyle.push(styles.vertical);
        break;
      case 'grid':
        baseStyle.push(styles.grid);
        break;
    }
    
    return baseStyle;
  };

  return (
    <View style={[...getContainerStyle(), { gap: spacing }, style]}>
      {buttons.map((button, index) => (
        <ElegantButton
          key={index}
          {...button}
          style={[
            layout === 'horizontal' && styles.horizontalButton,
            layout === 'grid' && styles.gridButton,
            button.style,
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  horizontal: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vertical: {
    flexDirection: 'column',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  horizontalButton: {
    flex: 1,
  },
  gridButton: {
    flex: 1,
    minWidth: '48%',
  },
});

export default ElegantButtonGroup;