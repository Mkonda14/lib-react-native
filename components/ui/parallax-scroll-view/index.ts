/**
 * ParallaxScrollView — public API
 * ================================
 *
 * Quick usage:
 *
 *   import { ParallaxScrollView } from '@/components/parallax-scroll-view'
 *
 *   <ParallaxScrollView
 *     headerHeight={300}
 *     headerImage={<Image source={...} style={{ flex: 1 }} />}
 *     onRefresh={handleRefresh}
 *     refreshing={loading}
 *     keyboardAware
 *   >
 *     <Card>...</Card>
 *   </ParallaxScrollView>
 *
 * Advanced header config:
 *
 *   <ParallaxScrollView
 *     header={{
 *       height: 280,
 *       behavior: 'cover',
 *       largeTitle: 'Profil',
 *       blur: true,
 *       renderHeader: ({ scrollOffset }) => (
 *         <Animated.View style={{ flex: 1 }}>
 *           <ImageBackground source={...} style={{ flex: 1 }} />
 *           <LargeTitle offset={scrollOffset} text="Profil" />
 *         </Animated.View>
 *       ),
 *     }}
 *   >
 *     ...
 *   </ParallaxScrollView>
 */

export { ParallaxScrollView } from './parallax-scroll-view'
export { ParallaxHeader } from './header'
export { useParallaxScroll } from './use-parallax-scroll'

export type {
  ParallaxScrollViewProps,
  HeaderConfig,
  HeaderBehavior,
  UseParallaxScrollReturn,
} from './types'