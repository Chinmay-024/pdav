include "../../../../../circomlib/circuits/comparators.circom"

template ValidateData(pc, sc, sgc) { 	
    signal input aggregatorATotalCandidates;
    signal input aggregatorBTotalCandidates;
    signal input aggregatorCTotalCandidates;
    
    signal private input aggregatorATotalData;
    signal private input aggregatorBTotalData;
    signal private input aggregatorCTotalData;
    signal private input totalData;
    
    signal private input aggregatorA[pc];
    signal private input aggregatorB[sc];
    signal private input aggregatorC[sgc];

    signal private input agent;
    signal private input signature;
	signal private input p;
	signal private input rcm[2];
    
    signal output outaggregatorATotalData = 0;
    signal output outaggregatorBTotalData = 0;
    signal output outaggregatorCTotalData = 0;
    signal output outTotalData = 0;
    
    for (var i=0; i<aggregatorATotalCandidates; i++) {
        if (aggregatorA[i] == 1){
            outaggregatorATotalData+=1;
            outTotalData+=1;
            outaggregatorATotalData === 1; // Constraint allow just one data
        }
    }

    for (var j=0; j<aggregatorBTotalCandidates; j++) {
        if (aggregatorB[j] == 1){
            outaggregatorBTotalData+=1;        
            outTotalData+=1;
            outaggregatorBTotalData === 1; // Constraint allow just one data
        }
    }

    for (var k=0; k<aggregatorCTotalCandidates; k++) {
        if (aggregatorC[k] == 1){
            outaggregatorCTotalData+=1;
            outTotalData+=1;        
            outaggregatorCTotalData === 1; // Constraint allow just one data
        }
    }
 
    // Test if each pool received correct input
    aggregatorATotalData === 1;
    aggregatorBTotalData === 1;    
    aggregatorCTotalData === 1;

    // Test the total data on input and counted
    totalData === aggregatorATotalData+aggregatorBTotalData+aggregatorCTotalData;
    outTotalData === outaggregatorATotalData+outaggregatorBTotalData+outaggregatorCTotalData;

    // Trick for comparing an input with an output
    // Must convert the number using this method and comparing after
    component iszA = IsZero();
    iszA.in <== totalData - (aggregatorATotalData+aggregatorBTotalData+aggregatorCTotalData);
    iszA.out === 1;

    component iszB = IsZero();
    iszB.in <== outTotalData - (outaggregatorATotalData+outaggregatorBTotalData+outaggregatorCTotalData);
    iszB.out === 1;

    component isequal = IsEqual();
    isequal.in[0] <== iszA.out;
    isequal.in[1] <== iszB.out;
    isequal.out === 1;

    iszB.out === iszA.out;

    // Check if the input total candidates are aligned with the setup
    pc === aggregatorATotalCandidates;
    sc === aggregatorBTotalCandidates;
    sgc === aggregatorCTotalCandidates;

}
component main = ValidateData(4,2,4);