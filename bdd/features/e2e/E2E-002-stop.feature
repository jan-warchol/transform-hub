Feature: Stop e2e tests

    Scenario: E2E-002 TC-001 Stop sequence process after 0s
        Given input file containing data "data.json"
        When host one execute sequence in background "../packages/samples/example.tar.gz" with arguments "/package/data.json output.txt"
        And wait "3000" ms
        And send stop message with timeout "0" and canKeepAlive "true"
        And wait "4000" ms
        Then host one process is stopped

    Scenario: E2E-002 TC-002 Stop sequence after 4s
        Given input file containing data "data.json"
        When host one execute sequence in background "../packages/samples/example.tar.gz" with arguments "/package/data.json output.txt"
        And wait "300" ms
        And send stop message with timeout "4000" and canKeepAlive "true"
        And wait "3000" ms
        Then host one process is working
        And wait "5000" ms
        And host one process is stopped