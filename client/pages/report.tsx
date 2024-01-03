import { useFormState } from "react-use-form-state";
import { Flex } from "rebass/styled-components";
import React, { useState } from "react";
import axios from "axios";

import Text, { H2, Span } from "../components/Text";
import AppWrapper from "../components/AppWrapper";
import { TextInput } from "../components/Input";
import { Button } from "../components/Button";
import { Col } from "../components/Layout";
import Icon from "../components/Icon";
import { useMessage } from "../hooks";
import { APIv2 } from "../consts";

import getConfig from "next/config";

const { publicRuntimeConfig } = getConfig();

const ReportPage = () => {
  const [formState, { text }] = useFormState<{ url: string }>();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useMessage(5000);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage();
    try {
      await axios.post(`${APIv2.Links}/report`, { link: formState.values.url });
      setMessage("Thanks for the report, we'll take actions shortly.", "green");
      formState.clear();
    } catch (error) {
      setMessage(error?.response?.data?.error || "Couldn't send report.");
    }

    setLoading(false);
  };

  return (
    <AppWrapper>
      <Col width={600} maxWidth="97%" alignItems="flex-start">
        <H2 my={3} bold>
          举报滥用
        </H2>
        <Text mb={3}>
          报告滥用、恶意软件和钓鱼链接，请发送至以下电子邮件地址

          或使用表格。我们将尽快采取行动。
        </Text>
        <Text mb={4}>
          {(publicRuntimeConfig.REPORT_EMAIL || "").replace("@", "[at]")}
        </Text>
        <Text mb={3}>
          <Span bold>包含恶意软件/诈骗的 URL:</Span>
        </Text>
        <Flex
          as="form"
          flexDirection={["column", "row"]}
          alignItems={["flex-start", "center"]}
          justifyContent="flex-start"
          onSubmit={onSubmit}
        >
          <TextInput
            {...text("url")}
            placeholder={`${publicRuntimeConfig.DEFAULT_DOMAIN}/example`}
            height={[44, 54]}
            width={[1, 1 / 2]}
            flex="0 0 auto"
            mr={3}
            required
          />
          <Button type="submit" flex="0 0 auto" height={[40, 44]} mt={[3, 0]}>
            {loading && <Icon name={"spinner"} stroke="white" mr={2} />}
            发送报告
          </Button>
        </Flex>
        <Text fontSize={14} mt={3} color={message.color}>
          {message.text}
        </Text>
      </Col>
    </AppWrapper>
  );
};

export default ReportPage;
