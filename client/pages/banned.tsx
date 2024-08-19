import getConfig from "next/config";
import React from "react";

import AppWrapper from "../components/AppWrapper";
import { H2, H4, Span } from "../components/Text";
import Footer from "../components/Footer";
import ALink from "../components/ALink";
import { Col } from "../components/Layout";

const { publicRuntimeConfig } = getConfig();

const BannedPage = () => {
  return (
    <AppWrapper>
      <Col flex="1 1 100%" alignItems="center">
        <H2 textAlign="center" my={3} normal>
          链接因
          <Span style={{ borderBottom: "1px dotted rgba(0, 0, 0, 0.4)" }} bold>
            恶意软件或诈骗
          </Span>
          而被禁止并移除
        </H2>
        <H4 textAlign="center" normal>
          如果您发现由
          <Span style={{ borderBottom: "1px dotted rgba(0, 0, 0, 0.4)" }} bold>
            {publicRuntimeConfig.SITE_NAME}
          </Span>
           缩短的恶意软件/诈骗链接,
          <ALink href="/report" title="Send report" isNextLink>
             请向我们发送报告
          </ALink>
        </H4>
      </Col>
      <Footer />
    </AppWrapper>
  );
};

export default BannedPage;
