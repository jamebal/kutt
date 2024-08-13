import React from "react";
import { Flex } from "rebass/styled-components";

import FeaturesItem from "./FeaturesItem";
import { ColCenterH } from "./Layout";
import { Colors } from "../consts";
import { H3 } from "./Text";

const Features = () => (
  <ColCenterH
    width={1}
    flex="0 0 auto"
    py={[64, 100]}
    backgroundColor={Colors.FeaturesBg}
  >
    <H3 fontSize={[26, 28]} mb={72} light>
      前沿特性
    </H3>
    <Flex
      width={1200}
      maxWidth="100%"
      flex="1 1 auto"
      justifyContent="center"
      flexWrap={["wrap", "wrap", "wrap", "nowrap"]}
    >
      <FeaturesItem title="管理链接" icon="edit">
        创建、保护和删除您的链接，并通过详细统计信息进行监控。
      </FeaturesItem>
      <FeaturesItem title="自定义域名" icon="shuffle">
        为您的链接使用自定义域。免费添加或删除。
      </FeaturesItem>
      <FeaturesItem title="API" icon="zap">
        使用所提供的应用程序接口从任何地方创建、删除和获取 URL。
      </FeaturesItem>
      <FeaturesItem title="免费且开源" icon="heart">
        完全开源、免费。您可以将其托管在自己的服务器上。
      </FeaturesItem>
    </Flex>
  </ColCenterH>
);

export default Features;
