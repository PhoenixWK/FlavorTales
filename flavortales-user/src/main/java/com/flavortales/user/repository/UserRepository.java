package com.flavortales.user.repository;

import com.flavortales.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Integer> {

    boolean existsByEmail(String email);

    boolean existsByFullName(String fullName);

    Optional<User> findByEmail(String email);

    /**
     * Finds a user by either their e-mail address or their username (fullName).
     * Used by the login flow where the identifier field accepts either value.
     */
    @Query("SELECT u FROM User u WHERE u.email = :identifier OR u.fullName = :identifier")
    Optional<User> findByEmailOrFullName(@Param("identifier") String identifier);
}
