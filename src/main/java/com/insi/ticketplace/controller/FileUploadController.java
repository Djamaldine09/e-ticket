package com.insi.ticketplace.controller;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.insi.ticketplace.dto.response.ApiResponse;
import com.insi.ticketplace.dto.response.EventResponse;
import com.insi.ticketplace.exception.AppException;
import com.insi.ticketplace.service.EventService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class FileUploadController {

    private final EventService eventService;
    private final Cloudinary cloudinary;

    // Conservé uniquement pour servir les anciennes images déjà enregistrées
    // avec des URLs /api/uploads/... avant la migration vers Cloudinary.
    @Value("${app.upload.dir:uploads}")
    private String legacyUploadDir;

    @PostMapping("/events/{id}/image")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORGANIZER')")
    public ResponseEntity<ApiResponse<EventResponse>> uploadEventImage(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal UserDetails userDetails) throws IOException {

        if (file.isEmpty()) {
            throw new AppException("Fichier vide", HttpStatus.BAD_REQUEST);
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new AppException("Seules les images sont acceptées", HttpStatus.BAD_REQUEST);
        }

        // Nouveaux uploads : Cloudinary assure le stockage persistant.
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
        boolean isAdmin = userDetails.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

        EventResponse updated = eventService.updateImageUrl(
                id, imageUrl, userDetails.getUsername(), isAdmin);

        return ResponseEntity.ok(
                ApiResponse.success("Image uploadée", updated)
        );
    }

    @GetMapping("/uploads/{filename}")
    public ResponseEntity<Resource> serveLegacyFile(
            @PathVariable String filename) {
        try {
            Path filePath = Paths.get(legacyUploadDir)
                    .toAbsolutePath()
                    .resolve(filename)
                    .normalize();

            Resource resource = new UrlResource(filePath.toUri());

            if (!resource.exists() || !resource.isReadable()) {
                return ResponseEntity.notFound().build();
            }

            String contentType = Files.probeContentType(filePath);
            if (contentType == null) {
                contentType = MediaType.APPLICATION_OCTET_STREAM_VALUE;
            }

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .body(resource);

        } catch (MalformedURLException e) {
            return ResponseEntity.badRequest().build();
        } catch (IOException | IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
