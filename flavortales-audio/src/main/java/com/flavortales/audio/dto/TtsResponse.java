package com.flavortales.audio.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TtsResponse {

    /** audio.audio_id – bản ghi trong bảng audio (null khi chưa liên kết shop) */
    private Integer audioId;

    /** Language synthesized: "vi" | "en" | "zh" */
    private String language;

    /** file_asset.file_id */
    private Integer fileId;

    /** Public R2 / CDN URL for the audio */
    private String fileUrl;

    /** Thời lượng audio tính bằng giây (null nếu chưa xác định) */
    private Double durationSeconds;
}
