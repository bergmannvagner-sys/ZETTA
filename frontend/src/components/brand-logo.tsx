import { Image, View } from "react-native";

type BrandLogoProps = {
  width?: number;
};

const BRAND_LOGO_RATIO = 300 / 287;

export function BrandLogo({ width = 180 }: BrandLogoProps) {
  return (
    <View style={{ alignItems: "center", width: "100%" }}>
      <Image
        accessible={false}
        source={require("../../assets/brand-logo.png")}
        resizeMode="contain"
        style={{
          aspectRatio: BRAND_LOGO_RATIO,
          width
        }}
      />
    </View>
  );
}
