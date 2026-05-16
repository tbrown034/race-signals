import { FecClient } from "./client.mjs";

export function createFecAdapter(options = {}) {
  const client = new FecClient(options);

  return {
    client,
    candidateSearch(params) {
      return client.paginate("/v1/candidates/search/", {
        sort: "name",
        per_page: 100,
        ...params,
      });
    },
    candidateCommittees(candidateId, params = {}) {
      return client.paginate(`/v1/candidate/${candidateId}/committees/`, {
        per_page: 100,
        ...params,
      });
    },
    candidateTotals(candidateId, params = {}) {
      return client.paginate(`/v1/candidate/${candidateId}/totals/`, {
        per_page: 100,
        ...params,
      });
    },
    candidateFilings(candidateId, params = {}) {
      return client.paginate(`/v1/candidate/${candidateId}/filings/`, {
        per_page: 100,
        ...params,
      });
    },
    committeeTotals(committeeId, params = {}) {
      return client.paginate(`/v1/committee/${committeeId}/totals/`, {
        per_page: 100,
        ...params,
      });
    },
    committeeFilings(committeeId, params = {}) {
      return client.paginate(`/v1/committee/${committeeId}/filings/`, {
        per_page: 100,
        ...params,
      });
    },
    scheduleA(params = {}) {
      return client.paginate("/v1/schedules/schedule_a/", {
        per_page: 100,
        ...params,
      });
    },
    scheduleB(params = {}) {
      return client.paginate("/v1/schedules/schedule_b/", {
        per_page: 100,
        ...params,
      });
    },
    scheduleE(params = {}) {
      return client.paginate("/v1/schedules/schedule_e/", {
        per_page: 100,
        ...params,
      });
    },
  };
}
