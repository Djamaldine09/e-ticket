package com.insi.ticketplace.controller;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.insi.ticketplace.dto.response.ApiResponse;
import com.insi.ticketplace.dto.response.EventResponse;
import com.insi.ticketplace.exception.AppException;
import com.insi.ticketplace.service.EventService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class FileUploadController {

    private final EventService eventService;
    private final Cloudinary cloudinary;

    @PostMapping("/events/{id}/image")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORGANIZER')")
    public ResponseEntity<ApiResponse<EventResponse>> uploadEventImage(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file) throws IOException {

        if (file.isEmpty()) {
            throw new AppException("Fichier vide", HttpStatus.BAD_REQUEST);
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new AppException("Seules les images sont acceptées", HttpStatus.BAD_REQUEST);
        }

        // L'upload est désormais effectué directement dans Cloudinary.
        // Le backend ne dépend donc plus du filesystem éphémère de Render.
        Map<String, Object> uploadResult = cloudinary.uploader().upload(
                file.getBytes(),
                ObjectUtils.asMap(
                        "folder", "ticket-place/events",
                        "resource_type", "image"
                )
        );

        Object secureUrlValue = uploadResult.get("secure_url");
        if (secureUrlValue == null) {
            throw new AppException(
                    "Cloudinary n'a pas retourné l'URL de l'image",
                    HttpStatus.BAD_GATEWAY
            );
        }

        String imageUrl = secureUrlValue.toString();
        EventResponse updated = eventService.updateImageUrl(id, imageUrl);

        return ResponseEntity.ok(
                ApiResponse.success("Image uploadée", updated)
        );
    }
}
