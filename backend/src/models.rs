use serde::{Deserialize, Serialize};

/// Represents an R2U2 request
#[allow(non_camel_case_types)]
#[derive(Clone, Debug, Default, Deserialize, Serialize)]
pub struct R2U2_Request {
    pub booleanizer_enabled: bool,

    pub aux_enabled: bool,

    pub rewrite_enabled: bool,

    pub cse_enabled: bool,

    pub sat_enabled: bool,

    pub sat_timeout: i32,

    pub c2po_text: String,

    pub trace_text: String,
}

#[allow(non_camel_case_types)]
#[derive(Clone, Debug, Default, Deserialize, Serialize)]
pub struct r2u2_output_with_timestamp {
    /// Timestamp verdict was produced
    pub timestamp_produced: u32,
    /// Output produced by R2U2
    pub spec_num: u32,
    pub spec_str: String,
    pub time_index: u32,
    pub truth: bool,
}

#[allow(non_camel_case_types)]
#[derive(Clone, Debug, Default, Deserialize, Serialize)]
pub struct r2u2_contract_with_timestamp {
    /// Timestamp verdict was produced
    pub timestamp_produced: u32,
    /// Output produced by R2U2
    pub spec_str: String,
    pub time_index: u32,
    pub status: u8,
}

/// Represents an R2U2 Reply
#[allow(non_camel_case_types)]
#[derive(Clone, Debug, Default, Deserialize, Serialize)]
pub struct R2U2_Reply {
    pub error: bool,

    pub assembly_text: String,

    pub verdicts: Vec<r2u2_output_with_timestamp>,

    pub contracts: Vec<r2u2_contract_with_timestamp>
}

/// Represents a C2PO Reply
#[allow(non_camel_case_types)]
#[derive(Clone, Debug, Default, Deserialize, Serialize)]
pub struct C2PO_Reply {
    pub error: bool,

    pub assembly_text: String,

    pub download_text: String,
}