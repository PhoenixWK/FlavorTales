package com.flavortales.file.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class FileUploadResponse {

    private Integer fileId;
    private String  fileUrl;
    private String  originalFilename;
    private String  mimeType;
    private long    sizeBytes;
}
