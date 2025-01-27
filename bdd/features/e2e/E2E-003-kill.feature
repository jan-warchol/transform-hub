Feature: Kill e2e tests

    Scenario: E2E-003 TC-001 API test - Kill instance
        Given host is running
        When sequence "../packages/reference-apps/hello-alice-out.tar.gz" loaded
        And instance started
        And wait for instance healthy is "true"
        And get runner PID
        And send kill message to instance
        And runner has ended execution
        Then host is still running

    Scenario: E2E-003 TC-003 API test - Kill instance when it's not responding
        Given host is running
        When sequence "../packages/reference-apps/process-not-responding.tar.gz" loaded
        And instance started
        And wait for instance healthy is "true"
        And get runner PID
        And send kill message to instance
        And wait for "10000" ms
        And runner has ended execution
        Then host is still running
