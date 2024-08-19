import { Box, Flex } from "rebass/styled-components";
import React, { useState, useEffect } from "react";
import formatDate from "date-fns/format";
import { NextPage } from "next";
import axios from "axios";

import Text, { H1, H2, H4, Span } from "../components/Text";
import { getAxiosConfig, removeProtocol } from "../utils";
import { Button, NavButton } from "../components/Button";
import { Col, RowCenterV } from "../components/Layout";
import { Area, Bar, Pie, Map } from "../components/Charts";
import PageLoading from "../components/PageLoading";
import AppWrapper from "../components/AppWrapper";
import Divider from "../components/Divider";
import { APIv2, Colors } from "../consts";
import { useStoreState } from "../store";
import ALink from "../components/ALink";
import Icon from "../components/Icon";

interface Props {
  id?: string;
}

const StatsPage: NextPage<Props> = ({ id }) => {
  const { isAuthenticated } = useStoreState((s) => s.auth);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [data, setData] = useState<Record<string, any> | undefined>();
  const [period, setPeriod] = useState("lastDay");

  const stats = data && data[period];

  useEffect(() => {
    if (!id || !isAuthenticated) return;
    axios
      .get(`${APIv2.Links}/${id}/stats`, getAxiosConfig())
      .then(({ data }) => {
        setLoading(false);
        setError(!data);
        setData(data);
      })
      .catch(() => {
        setLoading(false);
        setError(true);
      });
  }, [id, isAuthenticated]);

  let errorMessage;

  if (!isAuthenticated) {
    errorMessage = (
      <Flex mt={3}>
        <Icon name="x" size={32} mr={3} stroke={Colors.TrashIcon} />
        <H2>You need to login to view stats.</H2>
      </Flex>
    );
  }

  if (!id || error) {
    errorMessage = (
      <Flex mt={3}>
        <Icon name="x" size={32} mr={3} stroke={Colors.TrashIcon} />
        <H2>Couldn&apos;t get stats.</H2>
      </Flex>
    );
  }

  const loader = loading && <PageLoading />;

  const total = stats && stats.views.reduce((sum, view) => sum + view, 0);
  const periodText = period.includes("last")
    ? `the last ${period.replace("last", "").toLocaleLowerCase()}`
    : "all time";

  let periodTextChinese = "全部时间";
  console.log('periodText', period);
  if (periodText === 'the last day') {
    periodTextChinese = "最近一天";
  } else if (periodText === 'the last week') {
    periodTextChinese = "最近一周";
  } else if (periodText === 'the last month') {
    periodTextChinese = "最近一个月";
  }

  return (
    <AppWrapper>
      {errorMessage ||
        loader ||
        (data && (
          <Col width={1200} maxWidth="95%" alignItems="stretch" m="40px 0">
            <Flex justifyContent="space-between" alignItems="center" mb={3}>
              <H1 fontSize={[18, 20, 24]} light>
                数据统计:{" "}
                <ALink href={data.link} title="Short link">
                  {removeProtocol(data.link)}
                </ALink>
              </H1>
              <Text fontSize={[13, 14]} textAlign="right">
                {data.target.length > 80
                  ? `${data.target.split("").slice(0, 80).join("")}...`
                  : data.target}
              </Text>
            </Flex>
            <Col
              backgroundColor="white"
              style={{
                borderRadius: 12,
                boxShadow: "0 6px 15px hsla(200, 20%, 70%, 0.3)",
                overflow: "hidden"
              }}
            >
              <RowCenterV
                flex="1 1 auto"
                backgroundColor={Colors.TableHeadBg}
                justifyContent="space-between"
                py={[3, 3, 24]}
                px={[3, 4]}
              >
                <H4>
                  总点击数: <Span bold>{data.total}</Span>
                </H4>
                <Flex>
                  {[
                    ["allTime", "All Time"],
                    ["lastMonth", "Month"],
                    ["lastWeek", "Week"],
                    ["lastDay", "Day"]
                  ].map(([p, n]) => (
                    <NavButton
                      ml={10}
                      disabled={p === period}
                      onClick={() => setPeriod(p as any)}
                      key={p}
                    >
                      {n}
                    </NavButton>
                  ))}
                </Flex>
              </RowCenterV>
              <Col p={[3, 4]}>
                <H2 mb={2} light>
                  {periodTextChinese} 跟踪到的点击数: {" "}
                  <Span
                    style={{
                      borderBottom: `1px dotted ${Colors.StatsTotalUnderline}`
                    }}
                    bold
                  >
                    {total}
                  </Span>{" "}
                </H2>
                <Text fontSize={[13, 14]} color={Colors.StatsLastUpdateText}>
                  最后更新时间{" "}
                  {formatDate(new Date(data.updatedAt), "yyyy-MM-dd HH:mm:ss")}
                </Text>
                <Flex width={1} mt={4}>
                  <Area data={stats.views} period={period} />
                </Flex>
                {total > 0 && (
                  <>
                    <Divider my={4} />
                    <Flex width={1}>
                      <Col flex="1 1 0">
                        <H2 mb={3} light>
                          引荐来源
                        </H2>
                        <Pie data={stats.stats.referrer} />
                      </Col>
                      <Col flex="1 1 0">
                        <H2 mb={3} light>
                          浏览器
                        </H2>
                        <Bar data={stats.stats.browser} />
                      </Col>
                    </Flex>
                    <Divider my={4} />
                    <Flex width={1}>
                      <Col flex="1 1 0">
                        <H2 mb={3} light>
                          国家
                        </H2>
                        <Map data={stats.stats.country} />
                      </Col>
                      <Col flex="1 1 0">
                        <H2 mb={3} light>
                          操作系统
                        </H2>
                        <Bar data={stats.stats.os} />
                      </Col>
                    </Flex>
                  </>
                )}
              </Col>
            </Col>
            <Box alignSelf="center" my={64}>
              <ALink href="/" title="返回首页" forButton isNextLink>
                <Button>
                  <Icon name="arrowLeft" stroke="white" mr={2} />
                  返回首页
                </Button>
              </ALink>
            </Box>
          </Col>
        ))}
    </AppWrapper>
  );
};

StatsPage.getInitialProps = ({ query }) => {
  return Promise.resolve(query);
};

StatsPage.defaultProps = {
  id: ""
};

export default StatsPage;
